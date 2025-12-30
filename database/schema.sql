-- Motionify PM Portal - Vertical Slice Database Schema
-- Created: 2025-12-30
-- Purpose: Complete schema for inquiry → deliverable vertical slice

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'client')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. SESSIONS TABLE (for magic link authentication)
-- ============================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. INQUIRIES TABLE (quiz submissions from landing page)
-- ============================================================================
CREATE TABLE inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  
  -- Contact information
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  contact_phone VARCHAR(50),
  project_notes TEXT,
  
  -- Quiz data (stored as JSON)
  quiz_answers JSONB NOT NULL,
  recommended_video_type VARCHAR(255),
  
  -- Relationships
  proposal_id UUID,
  assigned_to_admin_id UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (status IN ('new', 'reviewing', 'proposal_sent', 'negotiating', 'accepted', 
                    'project_setup', 'payment_pending', 'paid', 'converted', 'rejected', 'archived'))
);

-- ============================================================================
-- 4. PROPOSALS TABLE
-- ============================================================================
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  version INTEGER DEFAULT 1,
  
  -- Content
  description TEXT NOT NULL,
  deliverables JSONB NOT NULL, -- [{id, name, description, estimatedCompletionWeek}]
  
  -- Pricing (amounts in smallest unit: paise for INR, cents for USD)
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('INR', 'USD')),
  total_price BIGINT NOT NULL CHECK (total_price > 0),
  advance_percentage INTEGER NOT NULL CHECK (advance_percentage IN (40, 50, 60)),
  advance_amount BIGINT NOT NULL,
  balance_amount BIGINT NOT NULL,
  
  -- Response tracking
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  feedback TEXT,
  
  -- Edit history
  edit_history JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (status IN ('sent', 'accepted', 'rejected', 'changes_requested'))
);

-- ============================================================================
-- 5. PROJECTS TABLE (created after payment)
-- ============================================================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number VARCHAR(50) UNIQUE NOT NULL,
  
  -- Relationships
  inquiry_id UUID REFERENCES inquiries(id),
  proposal_id UUID REFERENCES proposals(id),
  client_user_id UUID REFERENCES users(id),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  
  -- Revision management
  total_revisions_allowed INTEGER DEFAULT 2,
  revisions_used INTEGER DEFAULT 0,
  
  -- Terms acceptance
  terms_accepted_at TIMESTAMPTZ,
  terms_accepted_by UUID REFERENCES users(id),
  terms_ip_address VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  CHECK (revisions_used <= total_revisions_allowed)
);

-- ============================================================================
-- 6. DELIVERABLES TABLE
-- ============================================================================
CREATE TABLE deliverables (
  id UUID PRIMARY KEY, -- Same ID as in proposal.deliverables[].id
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Content
  name VARCHAR(255) NOT NULL,
  description TEXT,
  estimated_completion_week INTEGER,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- File URLs (Cloudflare R2)
  beta_file_url TEXT,
  final_file_url TEXT,
  
  -- Approval tracking
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (status IN ('pending', 'in_progress', 'beta_ready', 'awaiting_approval', 
                    'revision_requested', 'approved', 'final_delivered'))
);

-- ============================================================================
-- 7. REVISION_REQUESTS TABLE
-- ============================================================================
CREATE TABLE revision_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  
  -- Requester
  requested_by UUID REFERENCES users(id),
  
  -- Feedback content
  feedback_text TEXT NOT NULL,
  timestamped_comments JSONB, -- [{timestamp: 32, comment: "Fix audio here"}]
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

-- ============================================================================
-- 8. PAYMENTS TABLE (Razorpay integration)
-- ============================================================================
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  proposal_id UUID REFERENCES proposals(id),
  project_id UUID REFERENCES projects(id),
  
  -- Payment details
  payment_type VARCHAR(50) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('INR', 'USD')),
  
  -- Razorpay data
  razorpay_order_id VARCHAR(255) UNIQUE,
  razorpay_payment_id VARCHAR(255) UNIQUE,
  razorpay_signature VARCHAR(500),
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Timestamps
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (payment_type IN ('advance', 'balance')),
  CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Sessions
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Inquiries
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_email ON inquiries(contact_email);
CREATE INDEX idx_inquiries_number ON inquiries(inquiry_number);
CREATE INDEX idx_inquiries_proposal ON inquiries(proposal_id);

-- Proposals
CREATE INDEX idx_proposals_inquiry ON proposals(inquiry_id);
CREATE INDEX idx_proposals_status ON proposals(status);

-- Projects
CREATE INDEX idx_projects_client ON projects(client_user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_number ON projects(project_number);

-- Deliverables
CREATE INDEX idx_deliverables_project ON deliverables(project_id);
CREATE INDEX idx_deliverables_status ON deliverables(status);

-- Revision Requests
CREATE INDEX idx_revisions_deliverable ON revision_requests(deliverable_id);
CREATE INDEX idx_revisions_project ON revision_requests(project_id);
CREATE INDEX idx_revisions_status ON revision_requests(status);

-- Payments
CREATE INDEX idx_payments_proposal ON payments(proposal_id);
CREATE INDEX idx_payments_project ON payments(project_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_revision_requests_updated_at BEFORE UPDATE ON revision_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Admin user for testing)
-- ============================================================================

INSERT INTO users (email, full_name, role) VALUES
  ('admin@motionify.com', 'Motionify Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

-- Display table count
SELECT 
  'Schema created successfully! Total tables: ' || COUNT(*)
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
