-- UP
CREATE TABLE IF NOT EXISTS payment_receipts (
  payment_id UUID PRIMARY KEY REFERENCES payments(id),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'legacy')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  message_id TEXT,
  CHECK (status != 'sent' OR (sent_at IS NOT NULL AND message_id IS NOT NULL))
);

INSERT INTO payment_receipts (payment_id, payload, status)
SELECT p.id, '{}', 'legacy' FROM payments p WHERE p.status = 'completed'
AND EXISTS (
  SELECT 1 FROM payment_webhook_logs w WHERE w.payment_id = p.id
  AND w.status = 'PROCESSED' AND w.signature_verified = true
  AND w.event IN ('payment.captured', 'order.paid')
)
ON CONFLICT (payment_id) DO NOTHING;

-- DOWN
DROP TABLE payment_receipts;
