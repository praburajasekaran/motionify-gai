import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import pg from 'pg';
import dotenv from 'dotenv';
import { initializePaymentDatabase, paymentTestPool, seedPaymentProposal } from './payment-fixture';

const serve = process.argv.includes('--serve');
const browser = process.argv.includes('--browser');
const balance = process.argv.includes('--balance');
let credentials: Record<string, string> | undefined;
let deliverySettings: Record<string, string> | undefined;
if (serve) {
  const file = process.env.PAYMENT_TEST_ENV_FILE || '.env.payment-test';
  assert(((await stat(file)).mode & 0o077) === 0, 'Test credentials must be accessible only to their owner');
  credentials = dotenv.parse(await readFile(file));
  assert(Object.keys(credentials).length === 2, 'Supply only the two Razorpay Test Mode settings');
  assert(credentials.RAZORPAY_KEY_ID?.startsWith('rzp_test_'), 'Sandbox requires a Razorpay test key');
  assert(credentials.RAZORPAY_KEY_SECRET, 'Sandbox requires a Razorpay test secret');
  if (process.env.PAYMENT_TEST_DELIVERY_ENV_FILE) {
    const deliveryFile = process.env.PAYMENT_TEST_DELIVERY_ENV_FILE;
    assert(((await stat(deliveryFile)).mode & 0o077) === 0, 'Test delivery settings must be accessible only to their owner');
    deliverySettings = dotenv.parse(await readFile(deliveryFile));
    const allowed = ['RAZORPAY_WEBHOOK_SECRET', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'PAYMENT_TEST_EMAIL'];
    assert(Object.keys(deliverySettings).every(key => allowed.includes(key)), 'Supply only the Test Mode delivery settings');
    assert((deliverySettings.RAZORPAY_WEBHOOK_SECRET?.length || 0) >= 32, 'Supply a separate Test Mode webhook secret');
    if (deliverySettings.PAYMENT_TEST_EMAIL) {
      assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliverySettings.PAYMENT_TEST_EMAIL), 'Supply a valid approved test inbox');
      assert(deliverySettings.RESEND_API_KEY && deliverySettings.RESEND_FROM_EMAIL, 'Real test receipts require Resend credentials and a sender');
    }
  }
}
if (process.argv.includes('--check-credentials')) {
  assert(credentials, 'Use --serve to check the Test Mode credential file');
  console.log('Razorpay Test Mode credential format and owner-only permissions pass. No provider request occurred.');
  process.exit(0);
}
const freePortServer = net.createServer();
await new Promise<void>(resolve => freePortServer.listen(0, '127.0.0.1', resolve));
const address = freePortServer.address();
assert(address && typeof address !== 'string');
const port = address.port;
await new Promise<void>(resolve => freePortServer.close(() => resolve()));
const dataDir = await mkdtemp(path.join(tmpdir(), 'motionify-payment-'));
const dbName = `motionify_payment_test_${randomBytes(8).toString('hex')}`;
let started = false;

try {
  execFileSync('initdb', ['-D', dataDir, '--auth=trust', '--encoding=UTF8', '--locale=C'], { stdio: 'pipe' });
  execFileSync('pg_ctl', ['-D', dataDir, '-l', path.join(dataDir, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start'], { stdio: 'pipe' });
  started = true;
  const user = process.env.USER;
  assert(user);
  const admin = new pg.Client({ host: '127.0.0.1', port, user, database: 'postgres' });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${dbName}`);
  await admin.end();
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}@127.0.0.1:${port}/${dbName}`;
  process.env.DATABASE_SSL = 'false';
  process.env.NODE_ENV = 'development';
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.RAZORPAY_WEBHOOK_SECRET = randomBytes(32).toString('hex');
  process.env.RAZORPAY_KEY_SECRET = randomBytes(32).toString('hex');
  process.env.RAZORPAY_KEY_ID = 'rzp_test_fixture';
  delete process.env.RESEND_API_KEY;
  delete process.env.SENTRY_DSN;
  delete process.env.ADMIN_NOTIFICATION_EMAIL;
  delete process.env.PROPOSAL_TOKENLESS_COMPATIBILITY;
  delete process.env.PAYMENT_TEST_EMAIL;
  if (deliverySettings) {
    for (const [key, value] of Object.entries(deliverySettings)) process.env[key] = value;
    process.env.APP_URL = 'http://127.0.0.1:8903';
    process.env.APP_ENV = 'test';
  }

  if (browser || (serve && balance)) {
    if (credentials) {
      process.env.RAZORPAY_KEY_ID = credentials.RAZORPAY_KEY_ID;
      process.env.RAZORPAY_KEY_SECRET = credentials.RAZORPAY_KEY_SECRET;
    }
    const pool = paymentTestPool();
    await initializePaymentDatabase(pool);
    const { startPaymentReadinessServer } = await import('./payment-readiness-server');
    const { server, captureEvidence } = await startPaymentReadinessServer(pool, serve);
    console.log('Open http://127.0.0.1:8903/__payment/login to review the synthetic project.');
    await new Promise<void>(resolve => {
      for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => resolve());
    });
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    if (serve && process.env.PAYMENT_TEST_EVIDENCE_FILE) {
      await writeFile(process.env.PAYMENT_TEST_EVIDENCE_FILE, JSON.stringify(await captureEvidence(), null, 2));
    }
    await pool.end();
    const { closePool } = await import('../netlify/functions/_shared/db');
    await closePool();
  } else if (!serve) {
    const args = process.argv.includes('--perf') ? ['scripts/payment-probe.ts'] : ['--test', 'netlify/functions/__tests__/payment-transactions.test.ts'];
    const child = spawn(process.execPath, ['--import', 'tsx', ...args], { env: process.env, stdio: 'inherit' });
    const exitCode = await new Promise<number>(resolve => child.on('exit', code => resolve(code ?? 1)));
    process.exitCode = exitCode;
  } else {
    assert(credentials);
    process.env.RAZORPAY_KEY_ID = credentials.RAZORPAY_KEY_ID;
    process.env.RAZORPAY_KEY_SECRET = credentials.RAZORPAY_KEY_SECRET;
    const pool = paymentTestPool();
    await initializePaymentDatabase(pool);
    const proposal = await seedPaymentProposal(pool);
    const { handler: handoff } = await import('../netlify/functions/payment-handoff');
    const { handler: publicProposal } = await import('../netlify/functions/public-proposal');
    const { handler: inquiry } = await import('../netlify/functions/inquiry-detail');
    const handlers = { 'payment-handoff': handoff, 'public-proposal': publicProposal, 'inquiry-detail': inquiry };
    const server = http.createServer(async (request, response) => {
      try {
        const url = new URL(request.url || '/', 'http://127.0.0.1:8888');
        const name = url.pathname.split('/')[3] as keyof typeof handlers;
        const handler = handlers[name];
        if (!handler) { response.writeHead(404); response.end(); return; }
        let body = '';
        for await (const chunk of request) body += chunk;
        const result = await handler({ httpMethod: request.method || 'GET', path: url.pathname,
          headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, String(value || '')])),
          body: body || null, queryStringParameters: Object.fromEntries(url.searchParams) });
        response.writeHead(result.statusCode, result.headers);
        response.end(result.body);
      } catch (error) {
        console.error(error instanceof Error ? error.message : 'Sandbox handler failed');
        response.writeHead(500, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Sandbox handler failed' }));
      }
    });
    await new Promise<void>(resolve => server.listen(8888, '127.0.0.1', resolve));
    console.log(`Razorpay TEST mode only. Open http://127.0.0.1:4173/payment/${proposal.proposalId}?token=${proposal.token}`);
    await new Promise<void>(resolve => {
      for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => resolve());
    });
    await new Promise<void>(resolve => server.close(() => resolve()));
    const payments = await pool.query(`SELECT pay.status, pay.amount, pay.currency,
      pay.razorpay_order_id, pay.razorpay_payment_id, pay.project_id,
      (SELECT count(*) FROM projects WHERE proposal_id = pay.proposal_id) AS project_count,
      (SELECT count(*) FROM project_team WHERE project_id = pay.project_id AND is_primary_contact = true) AS primary_contact_count
      FROM payments pay`);
    const authorization = `Basic ${Buffer.from(`${credentials.RAZORPAY_KEY_ID}:${credentials.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
    const evidence = await Promise.all(payments.rows.map(async payment => {
      const provider = payment.razorpay_payment_id
        ? await fetch(`https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}`, { headers: { Authorization: authorization } }).then(response => response.json())
        : null;
      return { ...payment, provider: provider ? { id: provider.id, order_id: provider.order_id,
        status: provider.status, captured: provider.captured, amount: provider.amount, currency: provider.currency } : null };
    }));
    console.log('Sandbox payment evidence', JSON.stringify(evidence));
    if (process.env.PAYMENT_TEST_EVIDENCE_FILE) await writeFile(process.env.PAYMENT_TEST_EVIDENCE_FILE, JSON.stringify(evidence, null, 2));
    await pool.end();
    const { closePool } = await import('../netlify/functions/_shared/db');
    await closePool();
  }
} finally {
  if (started) execFileSync('pg_ctl', ['-D', dataDir, '-m', 'fast', '-w', 'stop'], { stdio: 'pipe' });
  await rm(dataDir, { recursive: true, force: true });
}
