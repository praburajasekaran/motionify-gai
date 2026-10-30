import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { initializeReadinessDatabase, readinessPool, seedReadinessFixture, type ReadinessActor } from './readiness-fixture';
import { closePool } from '../netlify/functions/_shared/db';
import { handler as terms } from '../netlify/functions/projects-accept-terms';
import { handler as tasks } from '../netlify/functions/tasks';
import { handler as deliverables } from '../netlify/functions/deliverables';
import { handler as revisions } from '../netlify/functions/revision-requests';
import type { Handler } from '../netlify/functions/_shared/middleware';

const pool = readinessPool();
const samples: Record<string, number[]> = {};
async function measure(name: string, warmup: boolean, handler: Handler, actor: ReadinessActor,
  method: string, endpoint: string, payload: Record<string, unknown>) {
  const start = performance.now();
  const result = await handler({ httpMethod: method, path: `/.netlify/functions/${endpoint}`,
    headers: { cookie: `auth_token=${actor.token}`, 'x-requested-with': 'fetch' },
    body: JSON.stringify(payload) });
  const elapsed = performance.now() - start;
  assert([200, 201].includes(result.statusCode), `${name}: ${result.body}`);
  if (!warmup) (samples[name] ||= []).push(elapsed);
  return JSON.parse(result.body);
}

try {
  await initializeReadinessDatabase(pool);
  const rounds = Number(process.env.READINESS_PERF_ROUNDS || 20);
  assert(Number.isInteger(rounds) && rounds > 0 && rounds <= 100);
  for (let round = -2; round < rounds; round++) {
    await pool.query('TRUNCATE users, inquiries, projects CASCADE');
    await pool.query('DROP TABLE IF EXISTS rate_limit_entries');
    const fixture = await seedReadinessFixture(pool);
    const warmup = round < 0;
    await measure('terms', warmup, terms, fixture.actors.primary, 'POST', 'projects-accept-terms', { projectId: fixture.projectId, accepted: true });
    const task = await measure('task_create', warmup, tasks, fixture.actors.manager, 'POST', 'tasks', {
      projectId: fixture.projectId, title: 'Synthetic timing task', assignedTo: fixture.actors.staff.id, visible_to_client: true,
    });
    await measure('task_update', warmup, tasks, fixture.actors.staff, 'PATCH', `tasks/${task.id}`, { status: 'in_progress' });
    await pool.query("UPDATE deliverables SET status = 'beta_ready' WHERE id = $1", [fixture.deliverableId]);
    await measure('review', warmup, deliverables, fixture.actors.manager, 'PATCH', `deliverables/${fixture.deliverableId}`, { status: 'awaiting_approval' });
    await measure('revision', warmup, revisions, fixture.actors.primary, 'POST', 'revision-requests', {
      deliverableId: fixture.deliverableId, feedbackText: 'Please replace the opening with our approved title.',
    });
    await pool.query("UPDATE deliverables SET status = 'awaiting_approval' WHERE id = $1", [fixture.deliverableId]);
    await measure('approval', warmup, deliverables, fixture.actors.primary, 'PATCH', `deliverables/${fixture.deliverableId}`, { status: 'approved' });
  }
  const result = {
    environment: 'disposable loopback PostgreSQL, external email disabled, metadata processing only',
    samples: Object.fromEntries(Object.entries(samples).map(([name, values]) => {
      const sorted = [...values].sort((a, b) => a - b);
      return [name, { count: values.length, p95_ms: sorted[Math.ceil(sorted.length * 0.95) - 1], values_ms: values }];
    })),
  };
  if (process.env.READINESS_PERF_OUTPUT) await writeFile(process.env.READINESS_PERF_OUTPUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await closePool();
  await pool.end();
}
