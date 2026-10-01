import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

export function paymentTestPool() {
  const url = new URL(process.env.DATABASE_URL || '');
  assert.equal(url.hostname, '127.0.0.1');
  assert.match(url.pathname, /^\/motionify_payment_test_[a-f0-9]+$/);
  return new pg.Pool({ connectionString: url.toString(), ssl: false });
}

export async function initializePaymentDatabase(pool: pg.Pool) {
  for (const file of [
    'database/schema.sql',
    'database/migrations/009_payment_webhook_logs.sql',
    'database/migrations/012_create_project_team_tables.sql',
    'database/migrations/016_rename_project_manager_to_support.sql',
    'database/migrations/024_create_proposal_review_tokens.sql',
  ]) {
    const sql = (await readFile(file, 'utf8')).replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ');
    await pool.query(sql);
  }
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
