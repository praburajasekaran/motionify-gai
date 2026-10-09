import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';
import { seedPaymentProposal } from './payment-fixture';
import { initializeReadinessDatabase, readinessPool, seedReadinessFixture } from './readiness-fixture';
import type { Handler } from '../netlify/functions/_shared/middleware';

async function unusedPort() {
  const server = net.createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  await new Promise<void>(resolve => server.close(() => resolve()));
  return address.port;
}

const serve = process.argv.includes('--serve');
const storage = process.argv.includes('--real-storage') ? await testStorageCredentials() : undefined;

async function testStorageCredentials() {
  const file = process.env.READINESS_R2_ENV_FILE;
  assert(file, '--real-storage requires READINESS_R2_ENV_FILE');
  assert(((await stat(file)).mode & 0o077) === 0, 'Test credential file must be accessible only to its owner');
  const config = dotenv.parse(await readFile(file));
  const keys = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'] as const;
  assert(Object.keys(config).length === keys.length && keys.every(key => config[key]), 'Supply only the four R2 test settings');
  assert(/^[a-f0-9]{32}$/.test(config.R2_ACCOUNT_ID), 'A Cloudflare account ID is required');
  assert(config.R2_BUCKET_NAME === 'motionify-readiness-test', 'Only the dedicated readiness test bucket is allowed');
  return Object.fromEntries(keys.map(key => [key, config[key]]));
}
const dataDir = await mkdtemp(path.join(tmpdir(), 'motionify-readiness-'));
const dbName = `motionify_readiness_test_${randomBytes(8).toString('hex')}`;
const servers: http.Server[] = [];
let started = false;
let fixturePool: pg.Pool | undefined;
let child: ReturnType<typeof spawn> | undefined;
const stopped = new Promise<void>(resolve => {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => {
    child?.kill(signal);
    resolve();
  });
});

try {
  const port = await unusedPort();
  execFileSync('initdb', ['-D', dataDir, '--auth=trust', '--encoding=UTF8', '--locale=C'], { stdio: 'pipe' });
  execFileSync('pg_ctl', ['-D', dataDir, '-l', path.join(dataDir, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port} -k ${dataDir} -c shared_buffers=16MB -c max_connections=30 -c dynamic_shared_memory_type=mmap`, '-w', 'start'], { stdio: 'pipe' });
  started = true;
  assert(process.env.USER);
  const admin = new pg.Client({ host: '127.0.0.1', port, user: process.env.USER, database: 'postgres' });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();
  Object.assign(process.env, {
    DATABASE_URL: `postgresql://${encodeURIComponent(process.env.USER)}@127.0.0.1:${port}/${dbName}`,
    DATABASE_SSL: 'false', NODE_ENV: 'development', JWT_SECRET: randomBytes(32).toString('hex'),
    R2_ACCESS_KEY_ID: 'readiness-local', R2_SECRET_ACCESS_KEY: randomBytes(32).toString('hex'),
    R2_BUCKET_NAME: 'readiness-local',
    RAZORPAY_KEY_ID: 'rzp_test_readiness', RAZORPAY_KEY_SECRET: randomBytes(32).toString('hex'),
    RAZORPAY_WEBHOOK_SECRET: randomBytes(32).toString('hex'),
  });
  if (storage) Object.assign(process.env, storage);
  for (const key of ['RESEND_API_KEY', 'ADMIN_NOTIFICATION_EMAIL', 'SENTRY_DSN', 'PROPOSAL_TOKENLESS_COMPATIBILITY']) delete process.env[key];

  const objects = new Map<string, Buffer>();
  const objectServer = http.createServer(async (request, response) => {
    const key = new URL(request.url || '/', 'http://127.0.0.1').pathname;
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', '*');
    if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
    if (request.method === 'PUT') {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      objects.set(key, Buffer.concat(chunks));
      response.writeHead(200); response.end(); return;
    }
    if (request.method === 'DELETE') { objects.delete(key); response.writeHead(204); response.end(); return; }
    const object = objects.get(key);
    response.writeHead(object ? 200 : 404, { 'Content-Type': 'application/octet-stream' });
    response.end(object || 'Object not found');
  });
  await new Promise<void>(resolve => objectServer.listen(0, '127.0.0.1', resolve));
  servers.push(objectServer);
  const storageAddress = objectServer.address();
  assert(storageAddress && typeof storageAddress !== 'string');
  if (!storage) process.env.R2_ACCOUNT_ID = `http://127.0.0.1:${storageAddress.port}`;

  if (!serve) {
    const childArgs = process.argv.includes('--authorization-perf') ? ['scripts/authorization-probe.ts'] :
      process.argv.includes('--perf') ? ['scripts/readiness-probe.ts'] :
      ['--test', process.argv.includes('--authorization') ? 'netlify/functions/__tests__/authorization-readiness.test.ts' :
        'netlify/functions/__tests__/client-delivery-readiness.test.ts'];
    child = spawn(process.execPath, ['--import', 'tsx', ...childArgs], { env: process.env, stdio: 'inherit' });
    process.exitCode = await new Promise<number>(resolve => child!.once('exit', code => resolve(code ?? 1)));
  } else {
    fixturePool = readinessPool();
    await initializeReadinessDatabase(fixturePool);
    const fixture = await seedReadinessFixture(fixturePool);
    const names = ['auth-me', 'auth-verify-magic-link', 'projects', 'projects-accept-terms', 'tasks', 'deliverables', 'deliverable-files',
      'public-proposal', 'revision-requests', 'deliverable-feedback', 'r2-presign', 'activities', 'notifications', 'project-team', 'payments', 'users-settings', 'users-list',
      'proposals', 'inquiries', 'comments', 'project-invitations-create', 'invitations-list', 'invitations-revoke', 'users-update', 'users-delete'];
    const handlers: Record<string, Handler> = {};
    const codeRoot = path.resolve(process.env.READINESS_CODE_ROOT || '.');
    for (const name of names) {
      if (process.env.READINESS_CODE_ROOT && name === 'deliverable-feedback') continue;
      handlers[name] = (await import(pathToFileURL(path.join(codeRoot, `netlify/functions/${name}.ts`)).href)).handler;
    }
    const mimeTypes: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
      '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
    const dist = path.resolve(process.env.READINESS_ASSET_DIR || 'dist-readiness');
    const server = http.createServer(async (request, response) => {
      try {
        const url = new URL(request.url || '/', 'http://127.0.0.1');
        if (url.pathname === '/__readiness/fixture' && ['GET', 'POST'].includes(request.method || '')) {
          const selectedFixture = request.method === 'POST' ? await seedReadinessFixture(fixturePool!) : fixture;
          if (request.method === 'POST') {
            let body = '';
            for await (const chunk of request) body += chunk;
            const magicLinkActor = body && JSON.parse(body).magicLinkActor;
            if (magicLinkActor === 'primary' || magicLinkActor === 'secondary') {
              const actor = selectedFixture.actors[magicLinkActor];
              const token = randomBytes(32).toString('hex');
              await fixturePool!.query(`INSERT INTO magic_link_tokens (email, token, expires_at, remember_me)
                VALUES ($1, $2, NOW() + INTERVAL '1 hour', false)`, [actor.email, token]);
              response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              response.end(JSON.stringify({ ...selectedFixture, magicLink: { token, email: actor.email } })); return;
            }
            if (body && JSON.parse(body).proposalReview === true) {
              const proposal = await seedPaymentProposal(fixturePool!);
              await fixturePool!.query("UPDATE proposals SET status = 'sent' WHERE id = $1", [proposal.proposalId]);
              response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
              response.end(JSON.stringify(proposal)); return;
            }
            if (body && JSON.parse(body).fullyPaid === true) {
              await fixturePool!.query(`INSERT INTO payments (proposal_id, project_id, payment_type, amount, currency, status)
                VALUES ($1, $2, 'balance', 100, 'INR', 'completed')`, [selectedFixture.proposalId, selectedFixture.projectId]);
            }
          }
          response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          response.end(JSON.stringify(selectedFixture)); return;
        }
        const match = url.pathname.match(/^\/(?:api|\.netlify\/functions)\/([^/]+)/);
        if (match) {
          const handler = handlers[match[1]];
          if (!handler) { response.writeHead(404); response.end(JSON.stringify({ error: 'Unknown sandbox handler' })); return; }
          let body = '';
          for await (const chunk of request) body += chunk;
          const result = await handler({ httpMethod: request.method || 'GET',
            path: url.pathname.replace(/^\/api\//, '/.netlify/functions/'),
            headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, String(value || '')])),
            body: body || null, queryStringParameters: Object.fromEntries(url.searchParams) });
          response.writeHead(result.statusCode, result.headers); response.end(result.body); return;
        }
        const file = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
        assert(file.startsWith(dist + path.sep) || file === dist);
        let content: Buffer;
        let extension = path.extname(file);
        try { content = await readFile(file); } catch { content = await readFile(path.join(dist, 'index.html')); extension = '.html'; }
        response.writeHead(200, { 'Content-Type': mimeTypes[extension] || 'application/octet-stream' });
        response.end(content);
      } catch (error) {
        console.error('Readiness request failed', error instanceof Error ? error.message : error);
        response.writeHead(500, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: 'Readiness request failed' }));
      }
    });
    await new Promise<void>(resolve => server.listen(8901, '127.0.0.1', resolve));
    servers.push(server);
    console.log(`Isolated readiness server ready at http://127.0.0.1:8901. Synthetic sessions and ${storage ? 'dedicated test R2 storage' : 'local storage'} only.`);
    await stopped;
  }
} finally {
  for (const server of servers.reverse()) {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
  await fixturePool?.end();
  const { closePool } = await import('../netlify/functions/_shared/db');
  await closePool();
  if (started) execFileSync('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop'], { stdio: 'pipe' });
  await rm(dataDir, { recursive: true, force: true });
}
