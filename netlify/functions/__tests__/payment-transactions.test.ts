import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import crypto from 'node:crypto';
import { initializePaymentDatabase, paymentTestPool, seedPendingPayment } from '../../../scripts/payment-fixture';
import { closePool } from '../_shared/db';
import { verifyRazorpayCheckoutSignature } from '../_shared/payment-verification';
import { handler as webhook } from '../razorpay-webhook';
import { handler as handoff } from '../payment-handoff';
import { handler as publicProposal } from '../public-proposal';
import { handler as authenticatedPayments } from '../payments';
import { generateJWT, hashJWT } from '../_shared/jwt';
import { requireProposalAccess, requireInquiryAccess } from '../_shared/authorization';

const pool = paymentTestPool();
before(async () => initializePaymentDatabase(pool));
after(async () => { await closePool(); await pool.end(); });

function webhookEvent(orderId: string, overrides: { event?: string; amount?: number; currency?: string; eventId?: string } = {}) {
  const body = JSON.stringify({ entity: 'event', account_id: 'acc_test', contains: ['payment'], created_at: Math.floor(Date.now() / 1000), event: overrides.event || 'payment.captured',
    payload: { payment: { entity: { id: `pay_${orderId}`, order_id: orderId, amount: overrides.amount ?? 100,
      currency: overrides.currency ?? 'INR', status: overrides.event === 'payment.failed' ? 'failed' : 'captured' } } } });
  return { httpMethod: 'POST', path: '/.netlify/functions/razorpay-webhook', body,
    headers: { 'x-razorpay-event-id': overrides.eventId || crypto.randomUUID(),
      'x-razorpay-signature': crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!).update(body).digest('hex') } };
}

async function runWebhook(event: ReturnType<typeof webhookEvent>) {
  const result = await webhook(event as never, {} as never, () => {});
  assert(result);
  return { status: result.statusCode, body: JSON.parse(result.body) };
}

async function authenticatedCookie(userId: string, email: string): Promise<string> {
  const token = generateJWT({ id: userId, email, role: 'client' });
  await pool.query(
    `INSERT INTO sessions (user_id, jwt_token_hash, expires_at, token)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour', $3)`,
    [userId, hashJWT(token), crypto.randomUUID()],
  );
  return `auth_token=${token}`;
}

test('checkout signatures reject malformed suffixes even after a valid digest', () => {
  const secret = 'test_secret';
  const signature = crypto.createHmac('sha256', secret).update('order_1|pay_1').digest('hex');
  assert.equal(verifyRazorpayCheckoutSignature({ orderId: 'order_1', paymentId: 'pay_1', signature: signature + 'zz', secret }), false);
});

test('a capture activates exactly one project and duplicate delivery is acknowledged', async () => {
  const payment = await seedPendingPayment(pool);
  const event = webhookEvent(payment.orderId);
  assert.deepEqual((await runWebhook(event)).body, { status: 'ok', event: 'payment.captured', processed: true });
  assert.equal((await runWebhook(event)).body.status, 'already_processed');
  const { rows } = await pool.query(`SELECT pay.status, pay.project_id, pt.is_primary_contact,
    (SELECT count(*) FROM projects WHERE proposal_id = $1) AS project_count
    FROM payments pay JOIN project_team pt ON pt.project_id = pay.project_id AND pt.user_id = $2
    WHERE pay.id = $3`, [payment.proposalId, payment.userId, payment.paymentId]);
  assert.equal(rows[0].status, 'completed');
  assert.equal(rows[0].project_count, '1');
  assert.equal(rows[0].is_primary_contact, true);
});

test('failed payments persist without an admin notification address', async () => {
  const payment = await seedPendingPayment(pool);
  const result = await runWebhook(webhookEvent(payment.orderId, { event: 'payment.failed' }));
  assert.equal(result.body.processed, true);
  const { rows } = await pool.query('SELECT status FROM payments WHERE id = $1', [payment.paymentId]);
  assert.equal(rows[0].status, 'failed');
});

test('a failed audit entry does not suppress a valid retry', async () => {
  const payment = await seedPendingPayment(pool);
  const event = webhookEvent(payment.orderId);
  await pool.query(`INSERT INTO payment_webhook_logs (event, razorpay_event_id, razorpay_order_id, payload, signature, status)
    VALUES ('payment.captured', $1, $2, '{}', 'invalid', 'FAILED')`, [event.headers['x-razorpay-event-id'], payment.orderId]);
  const result = await runWebhook(event);
  assert.equal(result.body.processed, true);
  const { rows } = await pool.query('SELECT status FROM payments WHERE id = $1', [payment.paymentId]);
  assert.equal(rows[0].status, 'completed');
});

test('captured amount mismatch preserves pending state and reports failure', async () => {
  const payment = await seedPendingPayment(pool);
  const result = await runWebhook(webhookEvent(payment.orderId, { amount: 101 }));
  assert.equal(result.body.processed, false);
  const { rows } = await pool.query('SELECT status, project_id FROM payments WHERE id = $1', [payment.paymentId]);
  assert.deepEqual(rows[0], { status: 'pending', project_id: null });
});

test('public payment contact is available through a valid proposal token', async () => {
  const payment = await seedPendingPayment(pool);
  const result = await publicProposal({ httpMethod: 'GET', path: `/.netlify/functions/public-proposal/${payment.proposalId}`,
    headers: {}, body: null, queryStringParameters: { token: payment.token } });
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(result.body);
  assert.equal(body.paymentContact.contactEmail, payment.email);
  assert.equal(body.paymentContact.contactName, 'Payment Test Client');
  assert.equal(body.paymentContact.quiz_answers, undefined);
});

test('verification rejects an order mismatch before changing payment state', async () => {
  const payment = await seedPendingPayment(pool);
  const result = await handoff({ httpMethod: 'POST', path: '/.netlify/functions/payment-handoff/verify', headers: {},
    body: JSON.stringify({ proposalId: payment.proposalId, token: payment.token, paymentId: payment.paymentId,
      razorpayOrderId: 'order_other', razorpayPaymentId: 'pay_other', razorpaySignature: 'bad' }) });
  assert.equal(result.statusCode, 400);
  assert.equal(JSON.parse(result.body).error, 'Payment order does not match the server-created order');
  const { rows } = await pool.query('SELECT status FROM payments WHERE id = $1', [payment.paymentId]);
  assert.equal(rows[0].status, 'pending');
});

test('project activation failure rolls back capture and permits the same event to retry', async () => {
  const payment = await seedPendingPayment(pool);
  const event = webhookEvent(payment.orderId);
  await pool.query(`CREATE FUNCTION reject_test_project() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'Simulated project activation failure'; END $$`);
  await pool.query(`CREATE TRIGGER reject_test_project BEFORE INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION reject_test_project()`);
  try {
    assert.equal((await runWebhook(event)).status, 503);
    const { rows } = await pool.query('SELECT status, project_id FROM payments WHERE id = $1', [payment.paymentId]);
    assert.deepEqual(rows[0], { status: 'pending', project_id: null });
    const proposal = await pool.query('SELECT status FROM proposals WHERE id = $1', [payment.proposalId]);
    assert.equal(proposal.rows[0].status, 'sent');
  } finally {
    await pool.query('DROP TRIGGER reject_test_project ON projects');
    await pool.query('DROP FUNCTION reject_test_project()');
  }
  assert.equal((await runWebhook(event)).status, 200);
  assert.equal((await runWebhook(event)).body.status, 'already_processed');
  const { rows } = await pool.query('SELECT count(*) AS count FROM projects WHERE proposal_id = $1', [payment.proposalId]);
  assert.equal(rows[0].count, '1');
});

test('a failed event arriving after capture cannot reverse completed payment', async () => {
  const payment = await seedPendingPayment(pool);
  assert.equal((await runWebhook(webhookEvent(payment.orderId))).status, 200);
  assert.equal((await runWebhook(webhookEvent(payment.orderId, { event: 'payment.failed' }))).status, 200);
  const { rows } = await pool.query('SELECT status FROM payments WHERE id = $1', [payment.paymentId]);
  assert.equal(rows[0].status, 'completed');
});

test('currency mismatch cannot complete a pending payment', async () => {
  const payment = await seedPendingPayment(pool);
  assert.equal((await runWebhook(webhookEvent(payment.orderId, { currency: 'USD' }))).status, 503);
  const { rows } = await pool.query('SELECT status FROM payments WHERE id = $1', [payment.paymentId]);
  assert.equal(rows[0].status, 'pending');
});

test('malformed webhook signature is rejected and does not poison a valid retry', async () => {
  const payment = await seedPendingPayment(pool);
  const event = webhookEvent(payment.orderId);
  const signature = event.headers['x-razorpay-signature'];
  event.headers['x-razorpay-signature'] += 'zz';
  assert.equal((await runWebhook(event)).status, 401);
  const { rows } = await pool.query('SELECT status FROM payments WHERE id = $1', [payment.paymentId]);
  assert.equal(rows[0].status, 'pending');
  event.headers['x-razorpay-signature'] = signature;
  assert.equal((await runWebhook(event)).status, 200);
});

test('public contact stays private for missing, invalid, expired and revoked tokens', async () => {
  const payment = await seedPendingPayment(pool);
  const read = (token?: string) => publicProposal({ httpMethod: 'GET', path: `/.netlify/functions/public-proposal/${payment.proposalId}`,
    headers: {}, body: null, queryStringParameters: token ? { token } : {} });
  for (const token of [undefined, 'invalid']) {
    const response = await read(token);
    assert.equal(response.statusCode, token ? 403 : 401);
    assert.equal(JSON.parse(response.body).paymentContact, undefined);
  }
  await pool.query(`UPDATE proposal_review_tokens SET expires_at = NOW() - INTERVAL '1 day' WHERE proposal_id = $1`, [payment.proposalId]);
  assert.equal((await read(payment.token)).statusCode, 403);
  await pool.query(`UPDATE proposal_review_tokens SET expires_at = NOW() + INTERVAL '1 day', status = 'revoked' WHERE proposal_id = $1`, [payment.proposalId]);
  assert.equal((await read(payment.token)).statusCode, 403);
  process.env.PROPOSAL_TOKENLESS_COMPATIBILITY = 'true';
  try {
    const response = await read();
    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).paymentContact, null);
  } finally {
    delete process.env.PROPOSAL_TOKENLESS_COMPATIBILITY;
  }
});

test('an advance capture without a linked inquiry cannot be acknowledged as activated', async () => {
  const payment = await seedPendingPayment(pool);
  await pool.query('UPDATE proposals SET inquiry_id = NULL WHERE id = $1', [payment.proposalId]);
  assert.equal((await runWebhook(webhookEvent(payment.orderId))).status, 503);
  const { rows } = await pool.query('SELECT status, project_id FROM payments WHERE id = $1', [payment.paymentId]);
  assert.deepEqual(rows[0], { status: 'pending', project_id: null });
});

test('authenticated client verification and subsequent webhook activate one project', async () => {
  const payment = await seedPendingPayment(pool);
  const providerPaymentId = `pay_${payment.orderId}`;
  const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!).update(`${payment.orderId}|${providerPaymentId}`).digest('hex');
  const cookie = await authenticatedCookie(payment.userId, payment.email);
  const event = { httpMethod: 'POST', path: '/.netlify/functions/payments/verify',
    headers: { cookie, 'x-requested-with': 'fetch' },
    body: JSON.stringify({ paymentId: payment.paymentId, razorpayOrderId: payment.orderId,
      razorpayPaymentId: providerPaymentId, razorpaySignature: signature }) };
  const first = await authenticatedPayments(event);
  assert.equal(first.statusCode, 200, first.body);
  const projectId = JSON.parse(first.body).activation.projectId;
  assert.match(projectId, /^[a-f0-9-]{36}$/);
  const replay = await authenticatedPayments(event);
  assert.equal(replay.statusCode, 200, replay.body);
  assert.equal(JSON.parse(replay.body).activation.projectId, projectId);
  assert.equal((await runWebhook(webhookEvent(payment.orderId))).status, 200);
  const { rows } = await pool.query('SELECT count(*) AS count FROM projects WHERE proposal_id = $1', [payment.proposalId]);
  assert.equal(rows[0].count, '1');
});

test('another authenticated client cannot verify a payment they do not own', async () => {
  const payment = await seedPendingPayment(pool);
  const otherClient = await seedPendingPayment(pool);
  const cookie = await authenticatedCookie(otherClient.userId, otherClient.email);
  const response = await authenticatedPayments({ httpMethod: 'POST', path: '/.netlify/functions/payments/verify',
    headers: { cookie, 'x-requested-with': 'fetch' },
    body: JSON.stringify({ paymentId: payment.paymentId, razorpayOrderId: payment.orderId,
      razorpayPaymentId: 'pay_other_client', razorpaySignature: '0'.repeat(64) }) });
  assert.equal(response.statusCode, 403, response.body);
  const { rows } = await pool.query('SELECT status FROM payments WHERE id = $1', [payment.paymentId]);
  assert.equal(rows[0].status, 'pending');
});

test('checkout proposal and inquiry access resolve the canonical client relationship', async () => {
  const payment = await seedPendingPayment(pool);
  const client = { userId: payment.userId, email: payment.email, role: 'client' };
  assert.equal((await requireProposalAccess(client, payment.proposalId)).id, payment.proposalId);
  assert.equal((await requireInquiryAccess(client, payment.inquiryId)).id, payment.inquiryId);
  const otherClient = { userId: crypto.randomUUID(), email: 'other@example.test', role: 'client' };
  await assert.rejects(requireProposalAccess(otherClient, payment.proposalId), { statusCode: 403 });
  await assert.rejects(requireInquiryAccess(otherClient, payment.inquiryId), { statusCode: 403 });
});
