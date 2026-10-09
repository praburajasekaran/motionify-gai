import assert from 'node:assert/strict';
import { bootstrapDatabase } from '../database/bootstrap';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

export function paymentTestPool() {
  const url = new URL(process.env.DATABASE_URL || '');
  assert.equal(url.hostname, '127.0.0.1');
  assert.match(url.pathname, /^\/motionify_payment_test_[a-f0-9]+$/);
  return new pg.Pool({ connectionString: url.toString(), ssl: false });
}

export async function initializePaymentDatabase(pool: pg.Pool) {
  await bootstrapDatabase(pool);
}

export async function seedPaymentProposal(pool: pg.Pool) {
  const inquiryId = randomUUID();
  const proposalId = randomUUID();
  const userId = randomUUID();
  const email = `payment-${userId}@example.test`;
  await pool.query('INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, $4)',
    [userId, email, 'Payment Test Client', 'client']);
  await pool.query(`INSERT INTO inquiries (id, inquiry_number, contact_name, contact_email, quiz_answers)
    VALUES ($1, $2, 'Payment Test Client', $3, '{}')`, [inquiryId, `INQ-TEST-${inquiryId.slice(0, 8)}`, email]);
  await pool.query(`INSERT INTO proposals (id, inquiry_id, description, deliverables, currency,
    total_price, advance_percentage, advance_amount, balance_amount)
    VALUES ($1, $2, 'Isolated payment verification', $3, 'INR', 200, 50, 100, 100)`,
    [proposalId, inquiryId, JSON.stringify([{ id: randomUUID(), name: 'Test deliverable', description: 'Test only', estimatedCompletionWeek: 1 }])]);
  const { createProposalReviewToken } = await import('../netlify/functions/_shared/proposal-review-access');
  const { token } = await createProposalReviewToken(proposalId);
  return { proposalId, inquiryId, userId, email, token };
}

export async function seedPendingPayment(pool: pg.Pool) {
  const proposal = await seedPaymentProposal(pool);
  const orderId = `order_test_${randomUUID().replaceAll('-', '')}`;
  const { rows } = await pool.query(`INSERT INTO payments (proposal_id, payment_type, amount, currency, razorpay_order_id)
    VALUES ($1, 'advance', 100, 'INR', $2) RETURNING id`, [proposal.proposalId, orderId]);
  return { ...proposal, paymentId: rows[0].id as string, orderId };
}

export async function seedBalancePayment(pool: pg.Pool) {
  const advance = await seedPendingPayment(pool);
  const { acceptProposalAndCreateProject } = await import('../netlify/functions/_shared/proposal-payment-helpers');
  const client = await pool.connect();
  let projectId: string;
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE payments SET status = 'completed', paid_at = NOW(), razorpay_payment_id = $2
      WHERE id = $1`, [advance.paymentId, `pay_${advance.orderId}`]);
    const activation = await acceptProposalAndCreateProject(client, advance.paymentId);
    assert(activation.projectId);
    projectId = activation.projectId;
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  const orderId = `order_test_${randomUUID().replaceAll('-', '')}`;
  const { rows } = await pool.query(`INSERT INTO payments
    (proposal_id, payment_type, amount, currency, razorpay_order_id)
    VALUES ($1, 'balance', 100, 'INR', $2) RETURNING id`, [advance.proposalId, orderId]);
  return { ...advance, advancePaymentId: advance.paymentId, projectId, paymentId: rows[0].id as string, orderId };
}
