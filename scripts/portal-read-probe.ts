import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { initializeReadinessDatabase, readinessPool, seedReadinessFixture, type ReadinessActor } from './readiness-fixture';
import { closePool } from '../netlify/functions/_shared/db';
import { handler as projects } from '../netlify/functions/projects';
import { handler as inquiries } from '../netlify/functions/inquiries';
import { handler as deliverables } from '../netlify/functions/deliverables';
import { handler as files } from '../netlify/functions/deliverable-files';
import type { Handler } from '../netlify/functions/_shared/middleware';

type Sample = { actor: string; journey: string; status: number; elapsedMs: number; correct: boolean; serverTiming: string | null };
const pool = readinessPool();
const samples: Sample[] = [];

try {
  await initializeReadinessDatabase(pool);
  const fixture = await seedReadinessFixture(pool);
  const cases: Array<{ name: string; handler: Handler; endpoint: string; query?: Record<string, string>; valid: (body: any) => boolean }> = [
    { name: 'project-list', handler: projects, endpoint: 'projects', valid: body => Array.isArray(body) && body.some(p => p.id === fixture.projectId) },
    { name: 'project-detail', handler: projects, endpoint: `projects/${fixture.projectId}`, valid: body => body.id === fixture.projectId },
    { name: 'inquiries', handler: inquiries, endpoint: 'inquiries', valid: body => Array.isArray(body) },
    { name: 'deliverables', handler: deliverables, endpoint: 'deliverables', query: { projectId: fixture.projectId }, valid: body => Array.isArray(body) && body.some(d => d.id === fixture.deliverableId) },
    { name: 'files', handler: files, endpoint: 'deliverable-files', query: { deliverableId: fixture.deliverableId }, valid: Array.isArray },
  ];
  const actors: Array<[string, ReadinessActor]> = [['client', fixture.actors.primary], ['staff', fixture.actors.manager]];
  const rounds = Number(process.env.READINESS_PERF_ROUNDS || 20);
  assert(Number.isInteger(rounds) && rounds >= 1 && rounds <= 40);
  for (let round = -2; round < rounds; round++) {
    for (const [actorName, actor] of actors) {
      for (const item of cases) {
        const started = performance.now();
        const result = await item.handler({ httpMethod: 'GET', path: `/.netlify/functions/${item.endpoint}`,
          headers: { cookie: `auth_token=${actor.token}` }, body: null,
          queryStringParameters: item.name === 'inquiries' && actorName === 'client' ? { clientUserId: actor.id } : item.query });
        const elapsedMs = performance.now() - started;
        let correct = false;
        try { correct = result.statusCode === 200 && item.valid(JSON.parse(result.body)); } catch { correct = false; }
        if (round >= 0) samples.push({ actor: actorName, journey: item.name, status: result.statusCode, elapsedMs, correct,
          serverTiming: result.headers['Server-Timing'] || null });
      }
    }
  }
  const summary = actors.flatMap(([actor]) => cases.map(({ name }) => {
    const group = samples.filter(sample => sample.actor === actor && sample.journey === name);
    const valid = group.filter(sample => sample.correct).map(sample => sample.elapsedMs).sort((a, b) => a - b);
    const percentile = (p: number) => valid.length ? valid[Math.ceil(valid.length * p) - 1] : null;
    return { actor, journey: name, count: group.length, failures: group.length - valid.length,
      p50Ms: percentile(0.5), p75Ms: percentile(0.75), minMs: valid[0] ?? null, maxMs: valid.at(-1) ?? null };
  }));
  const result = { environment: 'disposable loopback PostgreSQL; warm authenticated handlers; synthetic fixture; no external providers', summary, samples };
  assert(process.env.READINESS_PERF_OUTPUT, 'Provide READINESS_PERF_OUTPUT');
  await writeFile(process.env.READINESS_PERF_OUTPUT, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(summary));
  if (samples.some(sample => !sample.correct)) process.exitCode = 1;
} finally {
  await closePool();
  await pool.end();
}
