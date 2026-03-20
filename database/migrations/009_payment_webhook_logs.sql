-- ============================================================================
-- Migration: Payment Webhook Logs Table
-- ============================================================================
-- This migration creates the payment_webhook_logs table for Razorpay webhook
-- audit trail and idempotency handling.
--
-- Created: 2026-01-28
-- Phase: PROD-07-payment-integration
-- ============================================================================

-- Payment webhook logs table for Razorpay webhook events
CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  event VARCHAR(100) NOT NULL,
  razorpay_event_id VARCHAR(255) UNIQUE,  -- For idempotency check (x-razorpay-event-id header)
  razorpay_order_id VARCHAR(255) NOT NULL,
  razorpay_payment_id VARCHAR(255),
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',  -- RECEIVED | PROCESSED | FAILED
  processed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  ip_address VARCHAR(45),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on razorpay_event_id for idempotency lookup (UNIQUE already creates an index, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_payment_webhook_logs_razorpay_event_id ON payment_webhook_logs(razorpay_event_id);

-- Index on razorpay_order_id for looking up webhooks by order
CREATE INDEX IF NOT EXISTS idx_payment_webhook_logs_razorpay_order_id ON payment_webhook_logs(razorpay_order_id);

-- Index on status for finding unprocessed webhooks
CREATE INDEX IF NOT EXISTS idx_payment_webhook_logs_status ON payment_webhook_logs(status);

-- Index on received_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_payment_webhook_logs_received_at ON payment_webhook_logs(received_at DESC);

-- Add comments for documentation
COMMENT ON TABLE payment_webhook_logs IS 'Audit log for all Razorpay webhook events with idempotency support';
COMMENT ON COLUMN payment_webhook_logs.razorpay_event_id IS 'Unique event ID from x-razorpay-event-id header, used for idempotency';
COMMENT ON COLUMN payment_webhook_logs.signature_verified IS 'Whether the webhook signature was successfully verified using HMAC SHA256';
COMMENT ON COLUMN payment_webhook_logs.status IS 'Processing status: RECEIVED (logged), PROCESSED (payment updated), FAILED (error occurred)';
