import { transaction, type PoolClient } from './db';
import { sendPaymentSuccessEmail } from '../send-email';
import { absoluteProjectAccessUrl, appOriginFromEnv } from '../../../shared/canonical-links';

type ReceiptPayload = Parameters<typeof sendPaymentSuccessEmail>[0];

export async function queuePaymentReceipt(client: PoolClient, paymentId: string): Promise<void> {
  const existing = await client.query('SELECT payment_id FROM payment_receipts WHERE payment_id = $1', [paymentId]);
  if (existing.rows.length) return;
  const legacy = await client.query(`SELECT id FROM payment_webhook_logs
    WHERE payment_id = $1 AND status = 'PROCESSED' AND signature_verified = true
    AND event IN ('payment.captured', 'order.paid') LIMIT 1`, [paymentId]);
  if (legacy.rows.length) {
    await client.query(`INSERT INTO payment_receipts (payment_id, payload, status)
      VALUES ($1, '{}', 'legacy') ON CONFLICT (payment_id) DO NOTHING`, [paymentId]);
    return;
  }
  const { rows } = await client.query(`SELECT p.payment_type, p.amount, p.currency,
    proj.id AS project_id, proj.project_number, u.email, u.full_name
    FROM payments p
    JOIN projects proj ON p.project_id = proj.id
    JOIN users u ON proj.client_user_id = u.id
    WHERE p.id = $1`, [paymentId]);
  const info = rows[0];
  if (!info?.email) throw new Error('Receipt recipient is unavailable');
  const payload: ReceiptPayload = {
    to: info.email,
    clientName: info.full_name || 'Client',
    projectNumber: info.project_number || 'Your Project',
    amount: (Number(info.amount) / 100).toFixed(2),
    currency: info.currency,
    paymentType: info.payment_type,
    projectUrl: absoluteProjectAccessUrl({ projectId: info.project_id, email: info.email }, appOriginFromEnv(process.env)),
    idempotencyKey: `payment-receipt/${paymentId}`,
  };
  await client.query(`INSERT INTO payment_receipts (payment_id, payload)
    VALUES ($1, $2) ON CONFLICT (payment_id) DO NOTHING`, [paymentId, JSON.stringify(payload)]);
}

export function createPaymentReceiptDelivery(send: typeof sendPaymentSuccessEmail = sendPaymentSuccessEmail) {
  return async (paymentId: string): Promise<void> => {
    await transaction(async client => {
      const { rows } = await client.query(`SELECT payload, status,
        created_at < NOW() - INTERVAL '23 hours' AS expired
        FROM payment_receipts WHERE payment_id = $1 FOR UPDATE`, [paymentId]);
      const receipt = rows[0];
      if (!receipt) throw new Error('Payment receipt is not queued');
      if (receipt.status !== 'pending') return;
      if (receipt.expired) throw new Error('Payment receipt requires reconciliation before the provider idempotency key expires');
      const result = await send(receipt.payload as ReceiptPayload);
      if (result.status !== 'sent') throw new Error(`Payment receipt delivery failed: ${result.code}`);
      await client.query(`UPDATE payment_receipts
        SET status = 'sent', sent_at = NOW(), message_id = $2 WHERE payment_id = $1`, [paymentId, result.messageId]);
      console.log('[Payment receipt] Sent', { paymentId, messageId: result.messageId });
    });
  };
}

export const deliverPaymentReceipt = createPaymentReceiptDelivery();
