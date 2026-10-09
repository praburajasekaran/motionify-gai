import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import type pg from 'pg';
import { seedBalancePayment, seedPendingPayment } from './payment-fixture';
import { generateJWT, hashJWT } from '../netlify/functions/_shared/jwt';
import { createPaymentsHandler } from '../netlify/functions/payments';
import { createRazorpayWebhookHandler } from '../netlify/functions/razorpay-webhook';
import { createPaymentReceiptDelivery } from '../netlify/functions/_shared/payment-receipts';
import type { Handler } from '../netlify/functions/_shared/middleware';

export async function startPaymentReadinessServer(pool: pg.Pool, realProvider = false) {
  type Fixture = Awaited<ReturnType<typeof seedPendingPayment>> & { projectId?: string; cookie: string };
  let fixture!: Fixture;
  const orders: { id: string; amount: number; currency: string }[] = [];
  const messages = new Map<string, { id: string; payload: string }>();
  let orderDelayMs = 0;
  let confirmationDelayMs = 0;
  let failConfirmationOnce = false;
  const handlers: Record<string, Handler> = {};
  for (const name of ['auth-me', 'projects', 'projects-accept-terms', 'proposal-detail', 'inquiry-detail', 'users-settings', 'activities', 'notifications']) {
    handlers[name] = (await import(`../netlify/functions/${name}.ts`)).handler;
  }
  handlers.payments = createPaymentsHandler(realProvider ? {} : { createOrder: async order => {
    await new Promise(resolve => setTimeout(resolve, orderDelayMs));
    const saved = { id: `order_${randomUUID().replaceAll('-', '')}`, amount: order.amount, currency: order.currency };
    orders.push(saved);
    return saved;
  } });
  const realReceiptTransport = realProvider && Boolean(process.env.PAYMENT_TEST_EMAIL && process.env.RESEND_API_KEY);
  const syntheticReceiptDelivery = createPaymentReceiptDelivery(async payload => {
    const key = payload.idempotencyKey;
    assert(key);
    const existing = messages.get(key);
    if (existing) assert.equal(existing.payload, JSON.stringify(payload));
    const message = existing || { id: `message_${randomUUID()}`, payload: JSON.stringify(payload) };
    messages.set(key, message);
    return { status: 'sent', messageId: message.id };
  });
  const webhook = createRazorpayWebhookHandler(realReceiptTransport ? {} : { deliverPaymentReceipt: syntheticReceiptDelivery });

  async function seed(balance = true) {
    const payment = balance ? await seedBalancePayment(pool) : await seedPendingPayment(pool);
    if (realReceiptTransport) {
      payment.email = process.env.PAYMENT_TEST_EMAIL!;
      await pool.query('UPDATE users SET email = $2 WHERE id = $1', [payment.userId, payment.email]);
    }
    await pool.query('DELETE FROM payments WHERE id = $1', [payment.paymentId]);
    await pool.query("UPDATE proposals SET status = $2 WHERE id = $1", [payment.proposalId, balance ? 'accepted' : 'sent']);
    const token = generateJWT({ id: payment.userId, email: payment.email, role: 'client' });
    await pool.query(`INSERT INTO sessions (user_id, jwt_token_hash, expires_at, token)
      VALUES ($1, $2, NOW() + INTERVAL '1 hour', $3)`, [payment.userId, hashJWT(token), randomUUID()]);
    fixture = { ...payment, cookie: token };
    orders.length = 0;
    messages.clear();
    orderDelayMs = 0;
    confirmationDelayMs = 0;
    failConfirmationOnce = false;
    return fixture;
  }
  await seed();
  async function captureEvidence() {
    const { rows } = await pool.query(`SELECT id, project_id, status, payment_type, amount, currency,
      razorpay_order_id, razorpay_payment_id FROM payments WHERE proposal_id = $1 ORDER BY payment_type`, [fixture.proposalId]);
    const payments = await Promise.all(rows.map(async payment => {
      if (!realProvider || !payment.razorpay_payment_id || payment.payment_type !== 'balance') return payment;
      const authorization = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
      const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.razorpay_payment_id)}`,
        { headers: { Authorization: `Basic ${authorization}` }, signal: AbortSignal.timeout(20_000) });
      assert(response.ok, 'Provider payment evidence request failed');
      const provider = await response.json();
      return { ...payment, provider: { id: provider.id, order_id: provider.order_id, status: provider.status,
        captured: provider.captured, amount: provider.amount, currency: provider.currency },
        matches: provider.id === payment.razorpay_payment_id && provider.order_id === payment.razorpay_order_id
          && provider.amount === Number(payment.amount) && provider.currency === payment.currency && provider.captured === true };
    }));
    const receipts = await pool.query(`SELECT payment_id, status, message_id FROM payment_receipts
      WHERE payment_id IN (SELECT id FROM payments WHERE proposal_id = $1)`, [fixture.proposalId]);
    const webhookLogs = await pool.query(`SELECT razorpay_event_id, event, status, signature_verified,
      razorpay_order_id, razorpay_payment_id FROM payment_webhook_logs
      WHERE razorpay_order_id IN (SELECT razorpay_order_id FROM payments WHERE proposal_id = $1)`, [fixture.proposalId]);
    return { environment: realProvider ? 'Disposable local PostgreSQL and Razorpay Test Mode' : 'Disposable local PostgreSQL and synthetic provider',
      projectId: fixture.projectId, payments, receipts: receipts.rows, webhookLogs: webhookLogs.rows,
      receiptTransport: realReceiptTransport ? 'Resend' : 'Synthetic' };
  }
  const dist = path.resolve('dist-payment-readiness');
  const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://127.0.0.1');
      let body = '';
      for await (const chunk of request) body += chunk;
      const json = (value: unknown, status = 200) => {
        response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(value));
      };
      if (realProvider && url.pathname === '/.netlify/functions/razorpay-webhook') {
        const result = await webhook({ httpMethod: request.method || 'GET', path: url.pathname, body,
          headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, String(value || '')])) } as never,
          {} as never, () => {});
        assert(result);
        json(JSON.parse(result.body), result.statusCode); return;
      }
      if (url.pathname === '/__payment/fixture') {
        if (request.method === 'POST') await seed(JSON.parse(body || '{}').balance !== false);
        json(fixture); return;
      }
      if (url.pathname === '/__payment/login') {
        response.writeHead(302, { 'Set-Cookie': `auth_token=${fixture.cookie}; HttpOnly; SameSite=Lax; Path=/`,
          Location: `/portal/projects/${fixture.projectId}/7` });
        response.end(); return;
      }
      if (url.pathname === '/__payment/state') {
        const payments = await pool.query(`SELECT id, project_id, status, payment_type, amount, currency,
          razorpay_order_id, razorpay_payment_id FROM payments WHERE proposal_id = $1 ORDER BY payment_type`, [fixture.proposalId]);
        const projects = await pool.query('SELECT id, status FROM projects WHERE proposal_id = $1', [fixture.proposalId]);
        const receipts = await pool.query(`SELECT payment_id, status, message_id FROM payment_receipts
          WHERE payment_id IN (SELECT id FROM payments WHERE proposal_id = $1)`, [fixture.proposalId]);
        json({ payments: payments.rows, projects: projects.rows, receipts: receipts.rows, orderCount: orders.length, messageCount: messages.size }); return;
      }
      if (url.pathname === '/__payment/provider-state' && realProvider) {
        json(await captureEvidence()); return;
      }
      if (!realProvider && url.pathname === '/__payment/fault') {
        const fault = JSON.parse(body || '{}');
        orderDelayMs = Number(fault.orderDelayMs || 0);
        confirmationDelayMs = Number(fault.confirmationDelayMs || 0);
        failConfirmationOnce = fault.failConfirmationOnce === true;
        json({ configured: true }); return;
      }
      if (!realProvider && url.pathname === '/__payment/proof') {
        const { orderId } = JSON.parse(body);
        assert(orders.some(order => order.id === orderId));
        const paymentId = `pay_${orderId}`;
        json({ razorpay_order_id: orderId, razorpay_payment_id: paymentId,
          razorpay_signature: createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest('hex') }); return;
      }
      if (!realProvider && url.pathname === '/__payment/webhook') {
        const data = JSON.parse(body);
        const order = orders.find(order => order.id === data.orderId);
        assert(order);
        const payload = JSON.stringify({ entity: 'event', account_id: 'acc_test', contains: ['payment'],
          created_at: Math.floor(Date.now() / 1000), event: data.event || 'payment.captured',
          payload: { payment: { entity: { id: `pay_${order.id}`, order_id: order.id, amount: order.amount,
            currency: order.currency, status: data.event === 'payment.failed' ? 'failed' : 'captured' } } } });
        const result = await webhook({ httpMethod: 'POST', path: '/.netlify/functions/razorpay-webhook', body: payload,
          headers: { 'x-razorpay-event-id': data.eventId || randomUUID(),
            'x-razorpay-signature': createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(payload).digest('hex') } } as never,
          {} as never, () => {});
        assert(result);
        json(JSON.parse(result.body), result.statusCode); return;
      }
      const match = url.pathname.match(/^\/(?:api|\.netlify\/functions)\/([^/]+)/);
      if (match) {
        if (url.pathname.endsWith('/verify')) {
          const shouldFail = failConfirmationOnce;
          failConfirmationOnce = false;
          await new Promise(resolve => setTimeout(resolve, confirmationDelayMs));
          if (shouldFail) { json({ error: 'Temporary confirmation failure' }, 503); return; }
        }
        const handler = handlers[match[1]];
        if (!handler) { json([], request.method === 'GET' ? 200 : 404); return; }
        const result = await handler({ httpMethod: request.method || 'GET', path: url.pathname.replace(/^\/api\//, '/.netlify/functions/'),
          headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, String(value || '')])),
          body: body || null, queryStringParameters: Object.fromEntries(url.searchParams) });
        response.writeHead(result.statusCode, result.headers); response.end(result.body); return;
      }
      const file = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
      assert(file.startsWith(dist + path.sep) || file === dist);
      let content: Buffer;
      let extension = path.extname(file);
      try { content = await readFile(file); }
      catch { content = await readFile(path.join(dist, 'index.html')); extension = '.html'; }
      response.writeHead(200, { 'Content-Type': mime[extension] || 'application/octet-stream' }); response.end(content);
    } catch (error) {
      console.error('Payment readiness request failed', error instanceof Error ? error.message : 'Unknown error');
      response.writeHead(500, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: 'Sandbox request failed' }));
    }
  });
  await new Promise<void>(resolve => server.listen(8903, '127.0.0.1', resolve));
  console.log(`Isolated payment server on http://127.0.0.1:8903. ${realProvider ? 'Razorpay Test Mode' : 'Synthetic provider'} and disposable PostgreSQL.`);
  return { server, captureEvidence };
}
