import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { initializeReadinessDatabase, readinessPool, seedReadinessFixture } from './readiness-fixture';
import type { Handler } from '../netlify/functions/_shared/middleware';
import type * as Database from '../netlify/functions/_shared/db';

type Variant = { name: string; handler: Handler; db: typeof Database };
type Sample = {
  variant: string; mode: 'cold-pool' | 'warm-pool'; elapsedMs: number;
  status: number; correct: boolean; connections: number; serverTiming: string;
};

const pool = readinessPool();
const baselineRoot = process.env.RATE_LIMIT_BASELINE_ROOT;
assert(baselineRoot && path.isAbsolute(baselineRoot), 'Provide an absolute RATE_LIMIT_BASELINE_ROOT checkout path');
assert(path.resolve(baselineRoot) !== process.cwd(), 'Baseline and candidate must be separate checkouts');
assert(process.env.READINESS_PERF_OUTPUT, 'Provide READINESS_PERF_OUTPUT');
const oneWayMs = Number(process.env.READINESS_DB_ONE_WAY_MS ?? 100);
assert(Number.isFinite(oneWayMs) && oneWayMs >= 0 && oneWayMs <= 500);
const databaseUrl = new URL(process.env.DATABASE_URL!);
const sockets = new Set<net.Socket>();
const timers = new Set<ReturnType<typeof setTimeout>>();
const proxyErrors: string[] = [];
const variants: Variant[] = [];
const samples: Sample[] = [];

const proxy = net.createServer(client => {
  const upstream = net.connect({ host: '127.0.0.1', port: Number(databaseUrl.port) });
  for (const [source, destination] of [[client, upstream], [upstream, client]]) {
    sockets.add(source);
    source.setNoDelay(true);
    source.on('data', chunk => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!destination.destroyed) destination.write(chunk);
      }, oneWayMs);
      timers.add(timer);
    });
    source.on('error', (error: NodeJS.ErrnoException) => {
      proxyErrors.push(error.code ?? 'UNKNOWN');
      destination.destroy();
    });
    source.on('end', () => destination.end());
    source.on('close', () => sockets.delete(source));
  }
});

try {
  await initializeReadinessDatabase(pool);
  const fixture = await seedReadinessFixture(pool);
  await pool.query(`INSERT INTO projects (project_number, name, client_user_id)
    SELECT 'PROJ-PROBE-' || n, 'Synthetic connection probe ' || n, $1
    FROM generate_series(1, 16) AS n`, [fixture.actors.primary.id]);
  const expectedIds = (await pool.query('SELECT id FROM projects ORDER BY id')).rows.map(row => row.id);
  await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address();
  assert(address && typeof address !== 'string');
  const proxiedUrl = new URL(databaseUrl);
  proxiedUrl.port = String(address.port);
  process.env.DATABASE_URL = proxiedUrl.toString();

  for (const [name, root] of [['baseline', baselineRoot], ['candidate', process.cwd()]]) {
    const load = (file: string) => import(pathToFileURL(path.join(root, 'netlify/functions', file)).href);
    const db: typeof Database = await load('_shared/db.ts');
    const { handler }: { handler: Handler } = await load('projects.ts');
    variants.push({ name, handler, db });
  }
  for (const mode of ['cold-pool', 'warm-pool'] as const) {
    for (let round = -1; round < 5; round++) {
      for (const variant of variants) {
        if (mode === 'cold-pool') await variant.db.closePool();
        const start = performance.now();
        const result = await variant.handler({
          httpMethod: 'GET', path: '/.netlify/functions/projects', body: null,
          headers: { cookie: `auth_token=${fixture.actors.admin.token}` },
        });
        const elapsedMs = performance.now() - start;
        let correct = false;
        try {
          const body = JSON.parse(result.body);
          correct = result.statusCode === 200 && Array.isArray(body) &&
            JSON.stringify(body.map((project: { id: string }) => project.id).sort()) === JSON.stringify(expectedIds);
        } catch { correct = false; }
        if (round >= 0) samples.push({ variant: variant.name, mode, elapsedMs, status: result.statusCode, correct,
          connections: variant.db.getPool().totalCount, serverTiming: result.headers['Server-Timing'] ?? '' });
        assert(correct, `${variant.name} ${mode} returned an incorrect project list, status ${result.statusCode}`);
      }
    }
  }
} finally {
  await Promise.all(variants.map(variant => variant.db.closePool()));
  for (const timer of timers) clearTimeout(timer);
  for (const socket of sockets) socket.destroy();
  if (proxy.listening) await new Promise<void>(resolve => proxy.close(() => resolve()));
  await pool.end();
  process.env.DATABASE_URL = databaseUrl.toString();
  const summary = ['cold-pool', 'warm-pool'].flatMap(mode => variants.map(({ name }) => {
    const group = samples.filter(sample => sample.mode === mode && sample.variant === name);
    const values = group.map(sample => sample.elapsedMs).sort((a, b) => a - b);
    return { mode, variant: name, count: values.length, failures: group.filter(sample => !sample.correct).length,
      medianMs: values[Math.floor(values.length / 2)] ?? null, minMs: values[0] ?? null, maxMs: values.at(-1) ?? null,
      connections: [...new Set(group.map(sample => sample.connections))] };
  }));
  const result = { environment: 'Local authenticated project handler; 18 synthetic projects; PostgreSQL without TLS; delayed loopback TCP; no Netlify or browser timing',
    oneWayDelayMs: oneWayMs, summary, proxyErrors, samples };
  await writeFile(process.env.READINESS_PERF_OUTPUT!, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ summary, proxyErrors }));
}
assert.equal(proxyErrors.length, 0, 'TCP proxy reported errors');
