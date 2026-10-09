import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { initializePaymentDatabase, paymentTestPool, seedPaymentProposal, seedBalancePayment } from './payment-fixture';
import { generateJWT, hashJWT } from '../netlify/functions/_shared/jwt';
import type { Handler } from '../netlify/functions/_shared/middleware';

const root = path.resolve(process.env.PAYMENT_CODE_ROOT || '.');
const { handler }: { handler: Handler } = await import(pathToFileURL(path.join(root, 'netlify/functions/payments.ts')).href);
const { closePool } = await import(pathToFileURL(path.join(root, 'netlify/functions/_shared/db.ts')).href);
const pool = paymentTestPool();
const require = createRequire(import.meta.url);
const api = require('razorpay/dist/api');
const original = api.prototype.post;
let providerCalls = 0;
api.prototype.post = async (request: { url: string; data: { amount: number; currency: string } }) => {
  assert.equal(request.url, '/orders', 'Only synthetic order creation is allowed');
  providerCalls++;
  await new Promise(resolve => setTimeout(resolve, 10));
  return { id: `order_${randomUUID().replaceAll('-', '')}`, ...request.data };
};
const samples: { paymentType: string; operation: string; elapsedMs: number; projectLinked?: boolean }[] = [];

try {
  await initializePaymentDatabase(pool);
  for (let round = -2; round < 20; round++) {
    for (const paymentType of ['advance', 'balance'] as const) {
      const fixture = paymentType === 'advance' ? await seedPaymentProposal(pool) : await seedBalancePayment(pool);
      if ('paymentId' in fixture) await pool.query('DELETE FROM payments WHERE id = $1', [fixture.paymentId]);
      const token = generateJWT({ id: fixture.userId, email: fixture.email, role: 'client' });
      await pool.query(`INSERT INTO sessions (user_id, jwt_token_hash, expires_at, token)
        VALUES ($1, $2, NOW() + INTERVAL '1 hour', $3)`, [fixture.userId, hashJWT(token), randomUUID()]);
      const headers = { cookie: `auth_token=${token}`, 'x-requested-with': 'fetch' };
      const started = performance.now();
      const response = await handler({ httpMethod: 'POST', path: '/.netlify/functions/payments/create-order', headers,
        body: JSON.stringify({ proposalId: fixture.proposalId, paymentType }) });
      const orderElapsed = performance.now() - started;
      assert.equal(response.statusCode, 201, response.body);
      const order = JSON.parse(response.body);
      assert.equal(order.amount, 100);
      assert.equal(order.currency, 'INR');
      const providerPaymentId = `pay_${order.razorpayOrderId}`;
      const proof = { paymentId: order.id, razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: providerPaymentId, razorpaySignature: createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
          .update(`${order.razorpayOrderId}|${providerPaymentId}`).digest('hex') };
      const confirmationStarted = performance.now();
      const confirmation = await handler({ httpMethod: 'POST', path: '/.netlify/functions/payments/verify', headers, body: JSON.stringify(proof) });
      const confirmationElapsed = performance.now() - confirmationStarted;
      assert.equal(confirmation.statusCode, 200, confirmation.body);
      const result = JSON.parse(confirmation.body);
      const projectLinked = Boolean(result.activation.projectId)
        && (!('projectId' in fixture) || fixture.projectId === result.activation.projectId);
      if (!process.env.PAYMENT_CODE_ROOT) assert.equal(projectLinked, true, 'Candidate confirmation must resolve the correct project');
      if (round >= 0) samples.push({ paymentType, operation: 'order', elapsedMs: orderElapsed },
        { paymentType, operation: 'confirmation', elapsedMs: confirmationElapsed, projectLinked });
    }
  }
  const summaries = ['advance', 'balance'].flatMap(paymentType => ['order', 'confirmation'].map(operation => {
    const rows = samples.filter(sample => sample.paymentType === paymentType && sample.operation === operation);
    const values = rows.map(row => row.elapsedMs).sort((a, b) => a - b);
    return { paymentType, operation, count: rows.length, p95Ms: values[Math.ceil(values.length * 0.95) - 1],
      ...(operation === 'confirmation' ? { linkedProjects: rows.filter(row => row.projectLinked).length } : {}) };
  }));
  assert(process.env.PAYMENT_PERF_OUTPUT, 'Provide PAYMENT_PERF_OUTPUT');
  await writeFile(process.env.PAYMENT_PERF_OUTPUT, JSON.stringify({ source: process.env.PAYMENT_CODE_ROOT ? 'baseline' : 'candidate',
    node: process.version, arch: process.arch, fakeProviderDelayMs: 10, providerCalls,
    environment: 'Real authenticated handlers and disposable PostgreSQL. SDK POST transport returns synthetic orders. No network provider or email requests.',
    summaries, samples }, null, 2));
  console.log(JSON.stringify(summaries));
} finally {
  api.prototype.post = original;
  await closePool();
  const { closePool: closeFixtureHandlerPool } = await import('../netlify/functions/_shared/db');
  await closeFixtureHandlerPool();
  await pool.end();
}
