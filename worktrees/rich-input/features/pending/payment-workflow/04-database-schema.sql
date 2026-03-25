-- ============================================================================
-- Payment Workflow - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: November 14, 2025
--
-- This schema defines all tables needed for the payment workflow including:
-- - payments (core payment transactions)
-- - project_payment_status (project-level payment tracking)
-- - invoices (manually uploaded invoices)
-- - deliverable_access_control (access management based on payment)
-- - payment_reminders (automated reminder emails)
-- - payment_webhook_logs (Razorpay webhook audit trail)
-- - payment_audit_logs (complete payment action history)
-- ============================================================================

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
-- Stores individual payment transactions (advance and balance payments)
-- One project has up to 2 payments: 1 advance + 1 balance

CREATE TABLE IF NOT EXISTS payments (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Payment Details
  type VARCHAR(20) NOT NULL, -- 'ADVANCE' | 'BALANCE'
  status VARCHAR(20) NOT NULL DEFAULT 'INITIATED', -- 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'
  amount BIGINT NOT NULL, -- Amount in smallest unit (paise for INR, cents for USD). E.g., 4000000 paise = ₹40,000. Frontend: divide by 100 for display
  currency VARCHAR(3) NOT NULL DEFAULT 'INR', -- 'INR' | 'USD'

  -- Razorpay Integration
  razorpay_order_id VARCHAR(255), -- Razorpay order ID (e.g., 'order_ABC123')
  razorpay_payment_id VARCHAR(255), -- Razorpay payment ID (e.g., 'pay_12345ABCDE')
  razorpay_signature VARCHAR(512), -- Webhook signature for verification (typically 64-256 chars)
  gateway_response JSONB, -- Full gateway response
  payment_method VARCHAR(50), -- 'UPI' | 'CARD' | 'NET_BANKING' | 'WALLET' | 'OTHER'

  -- User Tracking
  initiated_by UUID NOT NULL REFERENCES users(id), -- User who initiated payment
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE, -- When payment was confirmed

  -- Invoice Management
  invoice_id UUID REFERENCES invoices(id),
  invoice_number VARCHAR(50), -- Human-readable invoice number
  invoice_uploaded_at TIMESTAMP WITH TIME ZONE,
  invoice_uploaded_by UUID REFERENCES users(id),

  -- Failure Handling
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Additional custom data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_payment_type CHECK (type IN ('ADVANCE', 'BALANCE')),
  CONSTRAINT valid_payment_status CHECK (status IN ('INITIATED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),
  CONSTRAINT valid_currency CHECK (currency IN ('INR', 'USD')),
  CONSTRAINT positive_amount CHECK (amount > 0),
  CONSTRAINT valid_payment_method CHECK (
    payment_method IS NULL OR
    payment_method IN ('UPI', 'CARD', 'NET_BANKING', 'WALLET', 'OTHER')
  ),
  -- Each project can have only one advance and one balance payment
  CONSTRAINT unique_payment_type_per_project UNIQUE (project_id, type)
);

-- Indexes for performance
CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(type);
CREATE INDEX idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX idx_payments_initiated_by ON payments(initiated_by);

-- ============================================================================
-- PROJECT_PAYMENT_STATUS TABLE
-- ============================================================================
-- Tracks overall payment state of a project (separate from individual transactions)
-- One project has exactly one payment status record

CREATE TABLE IF NOT EXISTS project_payment_status (
  -- Core Identification (projectId is both PK and FK)
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,

  -- Overall Status
  payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_ADVANCE',
  -- 'PENDING_ADVANCE' | 'ADVANCE_PAID' | 'BETA_DELIVERED' | 'AWAITING_BALANCE' | 'FULLY_PAID' | 'EXPIRED'

  -- Currency (set by admin at project creation)
  currency VARCHAR(3) NOT NULL DEFAULT 'INR', -- 'INR' | 'USD'

  -- Amounts (in smallest currency unit - paise for INR, cents for USD)
  total_amount BIGINT NOT NULL, -- Total project cost in smallest unit. E.g., 8000000 paise = ₹80,000. Frontend: divide by 100 for display
  advance_percentage INTEGER NOT NULL, -- Advance payment percentage (40, 50, 60, etc.)
  advance_amount BIGINT NOT NULL, -- Advance amount in smallest unit. Calculated: total_amount * advance_percentage / 100
  balance_amount BIGINT NOT NULL, -- Balance amount in smallest unit. Calculated: total_amount - advance_amount
  paid_amount BIGINT DEFAULT 0, -- Total amount paid so far in smallest unit
  remaining_amount BIGINT NOT NULL, -- Amount still due in smallest unit

  -- Payment References
  advance_payment_id UUID REFERENCES payments(id),
  balance_payment_id UUID REFERENCES payments(id),

  -- Timeline
  advance_paid_at TIMESTAMP WITH TIME ZONE,
  balance_paid_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_project_payment_status CHECK (
    payment_status IN ('PENDING_ADVANCE', 'ADVANCE_PAID', 'BETA_DELIVERED', 'AWAITING_BALANCE', 'FULLY_PAID', 'EXPIRED')
  ),
  CONSTRAINT valid_project_currency CHECK (currency IN ('INR', 'USD')),
  CONSTRAINT positive_total_amount CHECK (total_amount > 0),
  CONSTRAINT valid_advance_percentage CHECK (advance_percentage > 0 AND advance_percentage < 100),
  CONSTRAINT valid_paid_amount CHECK (paid_amount >= 0 AND paid_amount <= total_amount)
);

-- Indexes
CREATE INDEX idx_project_payment_status_status ON project_payment_status(payment_status);
CREATE INDEX idx_project_payment_status_advance_payment_id ON project_payment_status(advance_payment_id);
CREATE INDEX idx_project_payment_status_balance_payment_id ON project_payment_status(balance_payment_id);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
-- Stores manually uploaded invoices by admin after each payment

CREATE TABLE IF NOT EXISTS invoices (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

  -- Invoice Details
  invoice_number VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'INV-2025-00123'
  type VARCHAR(20) NOT NULL, -- 'ADVANCE' | 'BALANCE' | 'FULL'
  amount BIGINT NOT NULL, -- Amount on invoice in smallest unit (paise for INR, cents for USD). Frontend: divide by 100 for display

  -- File Storage
  file_url TEXT NOT NULL, -- S3/storage URL to PDF
  file_name VARCHAR(255) NOT NULL, -- Original file name
  file_size INTEGER NOT NULL, -- File size in bytes

  -- Admin Tracking
  uploaded_by UUID NOT NULL REFERENCES users(id), -- Admin who uploaded
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Email Tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_sent_to TEXT[], -- Array of recipient emails

  -- Metadata
  notes TEXT, -- Optional admin notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_invoice_type CHECK (type IN ('ADVANCE', 'BALANCE', 'FULL')),
  CONSTRAINT positive_invoice_amount CHECK (amount > 0),
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760), -- Max 10MB
  CONSTRAINT valid_invoice_number CHECK (invoice_number ~ '^INV-\d{4}-\d{5}$')
);

-- Indexes
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_payment_id ON invoices(payment_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_uploaded_at ON invoices(uploaded_at DESC);
CREATE INDEX idx_invoices_uploaded_by ON invoices(uploaded_by);

-- ============================================================================
-- DELIVERABLE_ACCESS_CONTROL TABLE
-- ============================================================================
-- Tracks deliverable access based on payment status
-- Controls beta vs final access and expiry management

CREATE TABLE IF NOT EXISTS deliverable_access_control (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,

  -- Access Control
  requires_payment BOOLEAN DEFAULT TRUE, -- Whether payment is required for access
  required_payment_type VARCHAR(20), -- 'ADVANCE' | 'BALANCE' | NULL
  is_accessible BOOLEAN DEFAULT FALSE, -- Current accessibility state

  -- Beta vs Final
  beta_available BOOLEAN DEFAULT FALSE, -- Beta version available
  final_available BOOLEAN DEFAULT FALSE, -- Final version available (after balance paid)

  -- Expiry Management
  expiry_date TIMESTAMP WITH TIME ZONE, -- 365 days after delivery
  days_until_expiry INTEGER, -- Calculated field
  is_expired BOOLEAN DEFAULT FALSE, -- Whether access has expired
  expiry_warning_at TIMESTAMP WITH TIME ZONE, -- 7 days before expiry
  expiry_warning_sent BOOLEAN DEFAULT FALSE, -- Whether warning was sent

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_required_payment_type CHECK (
    required_payment_type IS NULL OR
    required_payment_type IN ('ADVANCE', 'BALANCE')
  ),
  -- Only one access control record per deliverable
  CONSTRAINT unique_deliverable_access UNIQUE (deliverable_id)
);

-- Indexes
CREATE INDEX idx_deliverable_access_project_id ON deliverable_access_control(project_id);
CREATE INDEX idx_deliverable_access_deliverable_id ON deliverable_access_control(deliverable_id);
CREATE INDEX idx_deliverable_access_expiry_date ON deliverable_access_control(expiry_date);
CREATE INDEX idx_deliverable_access_is_expired ON deliverable_access_control(is_expired);

-- ============================================================================
-- PAYMENT_REMINDERS TABLE
-- ============================================================================
-- Tracks automated payment reminder emails

CREATE TABLE IF NOT EXISTS payment_reminders (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,

  -- Reminder Details
  type VARCHAR(50) NOT NULL, -- 'ADVANCE_DUE' | 'BALANCE_DUE' | 'ACCESS_EXPIRING_SOON' | 'ACCESS_EXPIRED'
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'SENT' | 'FAILED'

  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL, -- When to send
  sent_at TIMESTAMP WITH TIME ZONE, -- When actually sent

  -- Recipients
  recipient_email VARCHAR(255) NOT NULL,
  recipient_user_id UUID NOT NULL REFERENCES users(id),

  -- Content
  email_subject VARCHAR(255) NOT NULL,
  email_template VARCHAR(100) NOT NULL, -- Template identifier

  -- Metadata
  attempts INTEGER DEFAULT 0, -- Number of send attempts
  last_error TEXT, -- Last error message if failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_reminder_type CHECK (
    type IN ('ADVANCE_DUE', 'BALANCE_DUE', 'ACCESS_EXPIRING_SOON', 'ACCESS_EXPIRED')
  ),
  CONSTRAINT valid_reminder_status CHECK (status IN ('PENDING', 'SENT', 'FAILED'))
);

-- Indexes
CREATE INDEX idx_payment_reminders_project_id ON payment_reminders(project_id);
CREATE INDEX idx_payment_reminders_payment_id ON payment_reminders(payment_id);
CREATE INDEX idx_payment_reminders_status ON payment_reminders(status);
CREATE INDEX idx_payment_reminders_scheduled_for ON payment_reminders(scheduled_for);
CREATE INDEX idx_payment_reminders_recipient_user_id ON payment_reminders(recipient_user_id);

-- ============================================================================
-- PAYMENT_WEBHOOK_LOGS TABLE
-- ============================================================================
-- Audit log for all Razorpay webhook events

CREATE TABLE IF NOT EXISTS payment_webhook_logs (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL, -- Linked payment if found

  -- Webhook Data
  event VARCHAR(100) NOT NULL, -- e.g., 'payment.captured'
  razorpay_order_id VARCHAR(255) NOT NULL,
  razorpay_payment_id VARCHAR(255),

  -- Request Details
  payload JSONB NOT NULL, -- Full webhook payload
  signature TEXT NOT NULL, -- Webhook signature
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE, -- Whether signature was valid

  -- Processing
  status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED', -- 'RECEIVED' | 'PROCESSED' | 'FAILED'
  processed_at TIMESTAMP WITH TIME ZONE, -- When webhook was processed
  error TEXT, -- Error message if processing failed

  -- Metadata
  ip_address VARCHAR(45), -- Source IP of webhook (IPv4 or IPv6)
  user_agent TEXT, -- User agent header
  received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_webhook_status CHECK (status IN ('RECEIVED', 'PROCESSED', 'FAILED'))
);

-- Indexes
CREATE INDEX idx_payment_webhook_logs_payment_id ON payment_webhook_logs(payment_id);
CREATE INDEX idx_payment_webhook_logs_razorpay_order_id ON payment_webhook_logs(razorpay_order_id);
CREATE INDEX idx_payment_webhook_logs_razorpay_payment_id ON payment_webhook_logs(razorpay_payment_id);
CREATE INDEX idx_payment_webhook_logs_status ON payment_webhook_logs(status);
CREATE INDEX idx_payment_webhook_logs_received_at ON payment_webhook_logs(received_at DESC);

-- ============================================================================
-- PAYMENT_AUDIT_LOGS TABLE
-- ============================================================================
-- Complete audit trail for all payment-related actions

CREATE TABLE IF NOT EXISTS payment_audit_logs (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE, -- Related payment if applicable

  -- Action Details
  action VARCHAR(50) NOT NULL, -- Type of action performed
  actor UUID NOT NULL REFERENCES users(id), -- User who performed action
  actor_role VARCHAR(50) NOT NULL, -- Role of actor

  -- Change Tracking
  previous_state JSONB, -- State before action
  new_state JSONB, -- State after action

  -- Context
  description TEXT NOT NULL, -- Human-readable description
  metadata JSONB DEFAULT '{}', -- Additional context

  -- Metadata
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45), -- Actor's IP address
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT valid_payment_action CHECK (
    action IN (
      'PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED',
      'INVOICE_UPLOADED', 'INVOICE_EMAIL_SENT', 'REMINDER_SENT',
      'DELIVERABLE_UNLOCKED', 'ACCESS_EXPIRED', 'ACCESS_EXTENDED',
      'REFUND_INITIATED', 'REFUND_COMPLETED'
    )
  )
);

-- Indexes
CREATE INDEX idx_payment_audit_logs_project_id ON payment_audit_logs(project_id);
CREATE INDEX idx_payment_audit_logs_payment_id ON payment_audit_logs(payment_id);
CREATE INDEX idx_payment_audit_logs_action ON payment_audit_logs(action);
CREATE INDEX idx_payment_audit_logs_actor ON payment_audit_logs(actor);
CREATE INDEX idx_payment_audit_logs_timestamp ON payment_audit_logs(timestamp DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp for payments
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- Trigger to update updated_at timestamp for project_payment_status
CREATE OR REPLACE FUNCTION update_project_payment_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_payment_status_updated_at
  BEFORE UPDATE ON project_payment_status
  FOR EACH ROW
  EXECUTE FUNCTION update_project_payment_status_updated_at();

-- Trigger to update updated_at timestamp for invoices
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

-- Trigger to update updated_at timestamp for deliverable_access_control
CREATE OR REPLACE FUNCTION update_deliverable_access_control_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deliverable_access_control_updated_at
  BEFORE UPDATE ON deliverable_access_control
  FOR EACH ROW
  EXECUTE FUNCTION update_deliverable_access_control_updated_at();

-- Trigger to update updated_at timestamp for payment_reminders
CREATE OR REPLACE FUNCTION update_payment_reminders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_reminders_updated_at
  BEFORE UPDATE ON payment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_reminders_updated_at();

-- Trigger to automatically update project_payment_status when payment completes
CREATE OR REPLACE FUNCTION update_project_payment_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when payment status changes to COMPLETED
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN

    -- Update project payment status based on payment type
    IF NEW.type = 'ADVANCE' THEN
      UPDATE project_payment_status
      SET
        payment_status = 'ADVANCE_PAID',
        advance_payment_id = NEW.id,
        advance_paid_at = NEW.completed_at,
        paid_amount = NEW.amount,
        remaining_amount = total_amount - NEW.amount
      WHERE project_id = NEW.project_id;

    ELSIF NEW.type = 'BALANCE' THEN
      UPDATE project_payment_status
      SET
        payment_status = 'FULLY_PAID',
        balance_payment_id = NEW.id,
        balance_paid_at = NEW.completed_at,
        paid_amount = total_amount,
        remaining_amount = 0
      WHERE project_id = NEW.project_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_payment_status_on_payment
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_project_payment_status_on_payment();

-- Trigger to calculate days_until_expiry for deliverable_access_control
CREATE OR REPLACE FUNCTION calculate_days_until_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL THEN
    NEW.days_until_expiry = EXTRACT(DAY FROM (NEW.expiry_date - CURRENT_TIMESTAMP));
    NEW.is_expired = (NEW.expiry_date < CURRENT_TIMESTAMP);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_days_until_expiry
  BEFORE INSERT OR UPDATE ON deliverable_access_control
  FOR EACH ROW
  EXECUTE FUNCTION calculate_days_until_expiry();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE payments IS 'Stores individual payment transactions for projects (advance and balance payments)';
COMMENT ON COLUMN payments.type IS 'Type of payment: ADVANCE (50%) or BALANCE (50%)';
COMMENT ON COLUMN payments.status IS 'Payment status: INITIATED | PROCESSING | COMPLETED | FAILED | REFUNDED';
COMMENT ON COLUMN payments.currency IS 'Currency for payment: INR or USD (set by admin at project creation)';
COMMENT ON COLUMN payments.razorpay_order_id IS 'Razorpay order ID for tracking payment in gateway';
COMMENT ON COLUMN payments.razorpay_payment_id IS 'Razorpay payment ID after successful payment';

COMMENT ON TABLE project_payment_status IS 'Tracks overall payment state of a project (one record per project)';
COMMENT ON COLUMN project_payment_status.payment_status IS 'Overall payment state: PENDING_ADVANCE | ADVANCE_PAID | BETA_DELIVERED | AWAITING_BALANCE | FULLY_PAID | EXPIRED';
COMMENT ON COLUMN project_payment_status.advance_percentage IS 'Advance payment percentage set by super admin (40, 50, 60, etc.)';

COMMENT ON TABLE invoices IS 'Stores manually uploaded invoices by admin after each payment';
COMMENT ON COLUMN invoices.invoice_number IS 'Human-readable invoice number (format: INV-YYYY-XXXXX)';

COMMENT ON TABLE deliverable_access_control IS 'Controls deliverable access based on payment status and manages expiry';
COMMENT ON COLUMN deliverable_access_control.requires_payment IS 'Whether payment is required to access this deliverable';
COMMENT ON COLUMN deliverable_access_control.beta_available IS 'Whether beta version (watermarked) is available';
COMMENT ON COLUMN deliverable_access_control.final_available IS 'Whether final version (no watermark) is available after balance payment';

COMMENT ON TABLE payment_reminders IS 'Tracks automated payment reminder emails';
COMMENT ON COLUMN payment_reminders.type IS 'Type of reminder: ADVANCE_DUE | BALANCE_DUE | ACCESS_EXPIRING_SOON | ACCESS_EXPIRED';

COMMENT ON TABLE payment_webhook_logs IS 'Audit log for all Razorpay webhook events';
COMMENT ON COLUMN payment_webhook_logs.signature_verified IS 'Whether Razorpay webhook signature was successfully verified';

COMMENT ON TABLE payment_audit_logs IS 'Complete audit trail for all payment-related actions';
COMMENT ON COLUMN payment_audit_logs.action IS 'Type of action: PAYMENT_INITIATED | PAYMENT_COMPLETED | INVOICE_UPLOADED | etc.';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
