-- ============================================================================
-- Add Missing Tables for Vertical Slice
-- Created: 2025-12-30
-- Purpose: Add only the 4 missing tables (inquiries, proposals, deliverables, payments)
-- Note: users, sessions, projects, revision_requests already exist in database
-- ============================================================================

-- Enable UUID extension (idempotent)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. INQUIRIES TABLE (quiz submissions from landing page)
-- ============================================================================
CREATE TABLE IF NOT EXISTS inquiries (
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
-- 2. PROPOSALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposals (
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
-- 3. DELIVERABLES TABLE (for vertical slice workflow)
-- Note: This is separate from existing project_deliverables table
-- ============================================================================
CREATE TABLE IF NOT EXISTS deliverables (
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
-- 4. VERTICAL SLICE PROJECTS TABLE (separate from existing projects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vertical_slice_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number VARCHAR(50) UNIQUE NOT NULL,

  -- Relationships
  inquiry_id UUID REFERENCES inquiries(id),
  proposal_id UUID REFERENCES proposals(id),
  client_user_id UUID,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'active',

  -- Revision management
  total_revisions_allowed INTEGER DEFAULT 2,
  revisions_used INTEGER DEFAULT 0,

  -- Terms acceptance
  terms_accepted_at TIMESTAMPTZ,
  terms_accepted_by UUID,
  terms_ip_address VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  CHECK (revisions_used <= total_revisions_allowed)
);

-- ============================================================================
-- 5. PAYMENTS TABLE (Razorpay integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
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

-- Inquiries
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(contact_email);
CREATE INDEX IF NOT EXISTS idx_inquiries_number ON inquiries(inquiry_number);
CREATE INDEX IF NOT EXISTS idx_inquiries_proposal ON inquiries(proposal_id);

-- Proposals
CREATE INDEX IF NOT EXISTS idx_proposals_inquiry ON proposals(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- Vertical Slice Projects
CREATE INDEX IF NOT EXISTS idx_vertical_slice_projects_client ON vertical_slice_projects(client_user_id);
CREATE INDEX IF NOT EXISTS idx_vertical_slice_projects_status ON vertical_slice_projects(status);
CREATE INDEX IF NOT EXISTS idx_vertical_slice_projects_number ON vertical_slice_projects(project_number);

-- Deliverables
CREATE INDEX IF NOT EXISTS idx_deliverables_project ON deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_proposal ON payments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_payments_project ON payments(project_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON payments(razorpay_order_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Reuse existing update_updated_at_column function if it exists
-- Otherwise create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for new tables
DROP TRIGGER IF EXISTS update_inquiries_updated_at ON inquiries;
CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vertical_slice_projects_updated_at ON vertical_slice_projects;
CREATE TRIGGER update_vertical_slice_projects_updated_at BEFORE UPDATE ON vertical_slice_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deliverables_updated_at ON deliverables;
CREATE TRIGGER update_deliverables_updated_at BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display newly created tables
SELECT 
  'Migration complete! Newly added tables:' as message,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('inquiries', 'proposals', 'deliverables', 'payments')
ORDER BY table_name;
