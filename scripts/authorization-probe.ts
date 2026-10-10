import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { initializeReadinessDatabase, readinessPool, seedReadinessFixture, type ReadinessActor } from './readiness-fixture';
import type { Handler } from '../netlify/functions/_shared/middleware';

const sourceRoot = path.resolve(process.env.READINESS_CODE_ROOT || '.');
const { handler }: { handler: Handler } = await import(pathToFileURL(path.join(sourceRoot, 'netlify/functions/projects.ts')).href);
const { getPool, closePool } = await import(pathToFileURL(path.join(sourceRoot, 'netlify/functions/_shared/db.ts')).href);
const fixturePool = readinessPool();
const handlerPool = getPool();
let queries = 0;
const query = handlerPool.query.bind(handlerPool);
handlerPool.query = (...args: Parameters<typeof handlerPool.query>) => { queries++; return query(...args); };
const records: Array<{ projects: number; operation: string; status: number; elapsed_ms: number; sql_queries: number }> = [];

async function invoke(actor: ReadinessActor, endpoint: string, expectedStatus: number, projectCount: number, operation: string, record: boolean) {
  queries = 0;
  const started = performance.now();
  const result = await handler({ httpMethod: 'GET', path: `/.netlify/functions/${endpoint}`,
    headers: { cookie: `auth_token=${actor.token}` }, body: null });
  const elapsed_ms = performance.now() - started;
  assert.equal(result.statusCode, expectedStatus, result.body);
  const body = JSON.parse(result.body);
  if (operation === 'list') assert.equal(body.length, projectCount);
  if (expectedStatus === 403) assert.equal(body.name, undefined);
  if (record) records.push({ projects: projectCount, operation, status: result.statusCode, elapsed_ms, sql_queries: queries });
}

try {
  await initializeReadinessDatabase(fixturePool);
  for (const count of [1, 20]) {
    await fixturePool.query('TRUNCATE users, inquiries, projects CASCADE');
    await fixturePool.query('DROP TABLE IF EXISTS rate_limit_entries');
    const fixture = await seedReadinessFixture(fixturePool);
    for (let i = 1; i < count; i++) {
      const project = (await fixturePool.query(`INSERT INTO projects (project_number, name, client_user_id)
        VALUES ($1, 'Synthetic authorization scale project', $2) RETURNING id`, [`AUTH-SCALE-${i}`, fixture.actors.primary.id])).rows[0];
      await fixturePool.query("INSERT INTO project_team (project_id, user_id, role, is_primary_contact) VALUES ($1, $2, 'client', true)", [project.id, fixture.actors.primary.id]);
    }
    for (let round = -2; round < 20; round++) {
      await invoke(fixture.actors.primary, `projects/${fixture.projectId}`, 200, count, 'allowed', round >= 0);
      await invoke(fixture.actors.unrelated, `projects/${fixture.projectId}`, 403, count, 'denied', round >= 0);
      await invoke(fixture.actors.primary, 'projects', 200, count, 'list', round >= 0);
    }
  }
  const summaries = [1, 20].flatMap(projects => ['allowed', 'denied', 'list'].map(operation => {
    const values = records.filter(row => row.projects === projects && row.operation === operation);
    const times = values.map(row => row.elapsed_ms).sort((a, b) => a - b);
    return { projects, operation, count: values.length, p95_ms: times[Math.ceil(times.length * 0.95) - 1],
      sql_query_counts: [...new Set(values.map(row => row.sql_queries))] };
  }));
  const report = { environment: 'disposable loopback PostgreSQL, real authenticated handlers, no provider requests',
    source: process.env.READINESS_CODE_ROOT ? 'baseline' : 'candidate', summaries, records };
  assert(process.env.READINESS_PERF_OUTPUT, 'Provide an evidence output path');
  await writeFile(process.env.READINESS_PERF_OUTPUT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(summaries));
} finally {
  handlerPool.query = query;
  await closePool();
  await fixturePool.end();
}
