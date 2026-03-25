-- ============================================================================
-- Inquiry to Project Workflow - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: 2025-01-11
--
-- This schema defines the tables needed for the inquiry-to-project workflow.
-- It extends the existing Motionify portal database with new tables for:
-- - Customer inquiries from the website
-- - Proposals sent to customers
-- - Proposal feedback/negotiation
-- - Internal inquiry notes
-- ============================================================================

-- ============================================================================
-- INQUIRIES TABLE
-- ============================================================================
-- Stores initial customer inquiries submitted via the website quiz/form

CREATE TABLE IF NOT EXISTS inquiries (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "INQ-2025-001"
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Contact Information
  company_name VARCHAR(255) NOT NULL,
  company_website VARCHAR(500),  -- Optional company website URL
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  referral_source VARCHAR(255),  -- "How did you hear about us?"

  -- Project Requirements
  project_type VARCHAR(100) NOT NULL,
  project_description TEXT NOT NULL,
  estimated_budget VARCHAR(50),
  desired_timeline VARCHAR(50),
  video_length VARCHAR(50),
  target_audience TEXT,
  specific_requirements TEXT,
  reference_links TEXT[],  -- PostgreSQL array of URLs

  -- Marketing Attribution (UTM Parameters)
  utm_source VARCHAR(255),      -- utm_source (e.g., "google", "facebook")
  utm_medium VARCHAR(255),      -- utm_medium (e.g., "cpc", "email")
  utm_campaign VARCHAR(255),    -- utm_campaign (campaign name)
  utm_term VARCHAR(255),        -- utm_term (paid keywords)
  utm_content VARCHAR(255),     -- utm_content (ad variation)

  -- Internal Management
  assigned_to_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Proposal Relationship
  proposal_id UUID,  -- Foreign key added after proposals table created

  -- Conversion to Project
  converted_to_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,

  -- Indexes for common queries
  CONSTRAINT valid_status CHECK (
    status IN (
      'new',
      'reviewing',
      'proposal_sent',
      'negotiating',
      'accepted',
      'payment_pending',
      'paid',
      'converted',
      'rejected',
      'archived'
    )
  ),
  CONSTRAINT valid_project_type CHECK (
    project_type IN (
      'Brand Story Video',
      'Product Demo / Explainer',
      'Social Media Content',
      'Event Coverage / Highlight Reel',
      'Other'
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);
CREATE INDEX idx_inquiries_contact_email ON inquiries(contact_email);
CREATE INDEX idx_inquiries_assigned_to ON inquiries(assigned_to_admin_id) WHERE assigned_to_admin_id IS NOT NULL;
CREATE INDEX idx_inquiries_converted ON inquiries(converted_to_project_id) WHERE converted_to_project_id IS NOT NULL;

-- Full-text search index for searching inquiries
CREATE INDEX idx_inquiries_search ON inquiries USING gin(
  to_tsvector('english',
    coalesce(company_name, '') || ' ' ||
    coalesce(contact_name, '') || ' ' ||
    coalesce(contact_email, '') || ' ' ||
    coalesce(project_description, '') || ' ' ||
    coalesce(referral_source, '')
  )
);

-- Index for UTM tracking queries (marketing analytics)
CREATE INDEX idx_inquiries_utm ON inquiries(utm_source, utm_medium, utm_campaign)
  WHERE utm_source IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiries_updated_at();

-- ============================================================================
-- PROPOSALS TABLE
-- ============================================================================
-- Stores proposals sent to customers with pricing, scope, and terms

CREATE TABLE IF NOT EXISTS proposals (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  proposal_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., "PROP-2025-001"
  version INT NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Unique Access (for customer to view without login)
  review_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- Required: 60 days from creation
  viewed_at TIMESTAMP WITH TIME ZONE,

  -- Pricing (stored in smallest currency unit to avoid floating point issues)
  total_price BIGINT NOT NULL,  -- In paise for INR or cents for USD (e.g., 800000 = ₹8,000 or $8,000)
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',  -- ISO 4217 currency code: 'INR' or 'USD'
  pricing_breakdown JSONB NOT NULL,  -- Array of PricingItem objects

  -- Project Scope
  project_scope TEXT NOT NULL,
  deliverables JSONB NOT NULL,  -- Array of ProposalDeliverable objects
  non_inclusions TEXT[],

  -- Timeline
  estimated_duration VARCHAR(100) NOT NULL,
  milestones JSONB,  -- Array of Milestone objects

  -- Revisions
  included_revisions INT NOT NULL DEFAULT 2,
  revision_policy TEXT NOT NULL,

  -- Payment
  payment_link TEXT,
  payment_terms TEXT NOT NULL,

  -- Team
  primary_contact_name VARCHAR(255),

  -- Acceptance
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by VARCHAR(255),

  -- Versioning (for negotiation)
  previous_version_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  changes_since_last_version TEXT,

  -- Additional
  additional_notes TEXT,

  -- Constraints
  CONSTRAINT valid_proposal_status CHECK (
    status IN (
      'draft',
      'sent',
      'viewed',
      'revision_requested',
      'accepted',
      'rejected',
      'expired',
      'superseded'
    )
  ),
  CONSTRAINT positive_price CHECK (total_price > 0),
  CONSTRAINT positive_revisions CHECK (included_revisions >= 0),
  CONSTRAINT valid_version CHECK (version > 0),
  CONSTRAINT valid_currency CHECK (currency IN ('INR', 'USD')),
  CONSTRAINT valid_deliverables_structure CHECK (
    -- Must be a JSON array
    jsonb_typeof(deliverables) = 'array' AND
    -- Must have 1-20 items
    jsonb_array_length(deliverables) >= 1 AND
    jsonb_array_length(deliverables) <= 20 AND
    -- Each item must have required fields: id, name, description
    -- All items must be objects with required keys
    (
      SELECT bool_and(
        jsonb_typeof(item) = 'object' AND
        item ? 'id' AND
        item ? 'name' AND
        item ? 'description' AND
        -- Validate types of required fields
        jsonb_typeof(item->'id') = 'string' AND
        jsonb_typeof(item->'name') = 'string' AND
        jsonb_typeof(item->'description') = 'string' AND
        -- If estimatedCompletionWeek exists, must be a number between 1-52
        (
          NOT (item ? 'estimatedCompletionWeek') OR
          (
            jsonb_typeof(item->'estimatedCompletionWeek') = 'number' AND
            (item->>'estimatedCompletionWeek')::INT >= 1 AND
            (item->>'estimatedCompletionWeek')::INT <= 52
          )
        ) AND
        -- If format exists, must be a string
        (
          NOT (item ? 'format') OR
          jsonb_typeof(item->'format') = 'string'
        )
      )
      FROM jsonb_array_elements(deliverables) AS item
    )
  )
);

-- Create indexes
CREATE INDEX idx_proposals_inquiry_id ON proposals(inquiry_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_review_token ON proposals(review_token);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposals_version ON proposals(inquiry_id, version DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_proposals_updated_at();

-- Add foreign key from inquiries to proposals (now that proposals exists)
ALTER TABLE inquiries
  ADD CONSTRAINT fk_inquiries_proposal_id
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL;

-- ============================================================================
-- PROPOSAL_FEEDBACK TABLE
-- ============================================================================
-- Stores customer feedback when requesting changes to proposals

CREATE TABLE IF NOT EXISTS proposal_feedback (
  -- Core
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Feedback Content
  feedback TEXT NOT NULL,
  specific_changes JSONB,  -- Object with budget, timeline, scope, etc. flags

  -- Admin Response
  admin_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',

  -- Constraints
  CONSTRAINT valid_feedback_status CHECK (
    status IN ('pending', 'responded', 'new_proposal_sent')
  )
);

-- Create indexes
CREATE INDEX idx_feedback_proposal_id ON proposal_feedback(proposal_id);
CREATE INDEX idx_feedback_inquiry_id ON proposal_feedback(inquiry_id);
CREATE INDEX idx_feedback_status ON proposal_feedback(status);
CREATE INDEX idx_feedback_created_at ON proposal_feedback(created_at DESC);

-- ============================================================================
-- INQUIRY_NOTES TABLE
-- ============================================================================
-- Stores internal admin notes for tracking inquiry progress

CREATE TABLE IF NOT EXISTS inquiry_notes (
  -- Core
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Properties
  is_internal BOOLEAN NOT NULL DEFAULT true,  -- Always true (not visible to customer)
  is_pinned BOOLEAN DEFAULT false,  -- Pin important notes to top

  CONSTRAINT non_empty_content CHECK (length(trim(content)) > 0)
);

-- Create indexes
CREATE INDEX idx_notes_inquiry_id ON inquiry_notes(inquiry_id);
CREATE INDEX idx_notes_author_id ON inquiry_notes(author_id);
CREATE INDEX idx_notes_created_at ON inquiry_notes(created_at DESC);
CREATE INDEX idx_notes_pinned ON inquiry_notes(inquiry_id, is_pinned, created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inquiry_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inquiry_notes_updated_at
  BEFORE UPDATE ON inquiry_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiry_notes_updated_at();

-- ============================================================================
-- SEQUENCES FOR GENERATING INQUIRY/PROPOSAL NUMBERS
-- ============================================================================

-- Sequence for inquiry numbers (resets annually)
CREATE SEQUENCE IF NOT EXISTS inquiry_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- Sequence for proposal numbers (resets annually)
CREATE SEQUENCE IF NOT EXISTS proposal_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

-- Function to generate inquiry number
CREATE OR REPLACE FUNCTION generate_inquiry_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  current_year INT;
  next_number INT;
  result VARCHAR(20);
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  next_number := nextval('inquiry_number_seq');
  result := 'INQ-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate proposal number
CREATE OR REPLACE FUNCTION generate_proposal_number()
RETURNS VARCHAR(20) AS $$
DECLARE
  current_year INT;
  next_number INT;
  result VARCHAR(20);
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  next_number := nextval('proposal_number_seq');
  result := 'PROP-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Active inquiries with proposal info
CREATE OR REPLACE VIEW active_inquiries AS
SELECT
  i.*,
  p.id AS current_proposal_id,
  p.proposal_number,
  p.version AS proposal_version,
  p.status AS proposal_status,
  p.total_price AS proposal_price,
  p.accepted_at AS proposal_accepted_at,
  u.name AS assigned_admin_name,
  u.email AS assigned_admin_email
FROM inquiries i
LEFT JOIN proposals p ON i.proposal_id = p.id
LEFT JOIN users u ON i.assigned_to_admin_id = u.id
WHERE i.status NOT IN ('converted', 'rejected', 'archived')
ORDER BY i.created_at DESC;

-- View: Proposals needing attention
CREATE OR REPLACE VIEW proposals_needing_attention AS
SELECT
  p.*,
  i.company_name,
  i.contact_name,
  i.contact_email,
  CASE
    WHEN p.status = 'sent' AND p.viewed_at IS NULL
      AND p.created_at < CURRENT_TIMESTAMP - INTERVAL '3 days'
    THEN 'not_viewed'
    WHEN p.status = 'viewed'
      AND p.created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
    THEN 'no_response'
    WHEN p.status = 'revision_requested'
    THEN 'needs_revision'
    ELSE 'ok'
  END AS attention_reason
FROM proposals p
JOIN inquiries i ON p.inquiry_id = i.id
WHERE p.status IN ('sent', 'viewed', 'revision_requested')
  AND i.status NOT IN ('converted', 'rejected', 'archived');

-- View: Inquiry activity summary
CREATE OR REPLACE VIEW inquiry_activity_summary AS
SELECT
  i.id AS inquiry_id,
  i.inquiry_number,
  i.company_name,
  i.status,
  i.created_at,
  COUNT(DISTINCT n.id) AS note_count,
  COUNT(DISTINCT p.id) AS proposal_count,
  COUNT(DISTINCT f.id) AS feedback_count,
  MAX(n.created_at) AS last_note_at,
  MAX(p.created_at) AS last_proposal_at,
  MAX(f.created_at) AS last_feedback_at
FROM inquiries i
LEFT JOIN inquiry_notes n ON i.id = n.inquiry_id
LEFT JOIN proposals p ON i.id = p.inquiry_id
LEFT JOIN proposal_feedback f ON i.id = f.inquiry_id
GROUP BY i.id, i.inquiry_number, i.company_name, i.status, i.created_at
ORDER BY i.created_at DESC;

-- ============================================================================
-- PERMISSIONS (Example - adjust based on your role system)
-- ============================================================================

-- Grant permissions for admin users
-- GRANT SELECT, INSERT, UPDATE ON inquiries TO admin_role;
-- GRANT SELECT, INSERT, UPDATE ON proposals TO admin_role;
-- GRANT SELECT, INSERT, UPDATE ON proposal_feedback TO admin_role;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON inquiry_notes TO admin_role;

-- Grant read-only for reporting/analytics
-- GRANT SELECT ON active_inquiries TO analytics_role;
-- GRANT SELECT ON proposals_needing_attention TO analytics_role;
-- GRANT SELECT ON inquiry_activity_summary TO analytics_role;

-- ============================================================================
-- SEED DATA (Optional - for development/testing)
-- ============================================================================

-- Example inquiry (commented out - uncomment for testing)
/*
INSERT INTO inquiries (
  inquiry_number,
  status,
  company_name,
  contact_name,
  contact_email,
  contact_phone,
  project_type,
  project_description,
  estimated_budget,
  desired_timeline,
  video_length,
  target_audience,
  specific_requirements,
  reference_links
) VALUES (
  generate_inquiry_number(),
  'new',
  'Acme Corporation',
  'John Smith',
  'john@acme.com',
  '+1 (555) 123-4567',
  'Product Demo / Explainer',
  'We need an explainer video showing how our SaaS platform helps teams collaborate remotely.',
  '$5,000 - $10,000',
  'Standard (1-2 months)',
  '2-3 minutes',
  'B2B SaaS customers, team leads',
  'Modern animation, upbeat music, professional voiceover',
  ARRAY['https://youtube.com/watch?v=example1']
);
*/

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Reset sequences at the start of each year (run via cron job)
-- This ensures inquiry numbers restart at INQ-YYYY-001 each year
/*
CREATE OR REPLACE FUNCTION reset_annual_sequences()
RETURNS VOID AS $$
BEGIN
  ALTER SEQUENCE inquiry_number_seq RESTART WITH 1;
  ALTER SEQUENCE proposal_number_seq RESTART WITH 1;
END;
$$ LANGUAGE plpgsql;

-- Schedule this to run on January 1st each year
-- Example cron expression: 0 0 1 1 * (midnight on Jan 1)
*/

-- Archive old inquiries (older than 2 years and not converted)
/*
CREATE OR REPLACE FUNCTION archive_old_inquiries()
RETURNS INT AS $$
DECLARE
  archived_count INT;
BEGIN
  UPDATE inquiries
  SET status = 'archived'
  WHERE created_at < CURRENT_DATE - INTERVAL '2 years'
    AND status NOT IN ('converted', 'archived')
    AND converted_to_project_id IS NULL;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
*/

-- Find duplicate inquiries by email (for cleanup)
/*
SELECT
  contact_email,
  COUNT(*) AS inquiry_count,
  ARRAY_AGG(inquiry_number ORDER BY created_at DESC) AS inquiry_numbers
FROM inquiries
GROUP BY contact_email
HAVING COUNT(*) > 1
ORDER BY inquiry_count DESC;
*/

-- ============================================================================
-- ANALYTICS QUERIES
-- ============================================================================

-- Conversion funnel metrics
/*
SELECT
  COUNT(*) FILTER (WHERE status = 'new') AS new_inquiries,
  COUNT(*) FILTER (WHERE status IN ('reviewing', 'proposal_sent')) AS in_review,
  COUNT(*) FILTER (WHERE status = 'negotiating') AS negotiating,
  COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
  COUNT(*) FILTER (WHERE status = 'payment_pending') AS awaiting_payment,
  COUNT(*) FILTER (WHERE status = 'paid') AS paid,
  COUNT(*) FILTER (WHERE status = 'converted') AS converted,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'converted')::NUMERIC /
    NULLIF(COUNT(*)::NUMERIC, 0) * 100,
    2
  ) AS conversion_rate_pct
FROM inquiries
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
*/

-- Average time to proposal
/*
SELECT
  AVG(p.created_at - i.created_at) AS avg_time_to_proposal,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.created_at - i.created_at) AS median_time_to_proposal
FROM inquiries i
JOIN proposals p ON i.id = p.inquiry_id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '90 days'
  AND p.version = 1;
*/

-- Proposal acceptance rate by project type
/*
SELECT
  i.project_type,
  COUNT(DISTINCT i.id) AS total_inquiries,
  COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN i.id END) AS accepted_proposals,
  ROUND(
    COUNT(DISTINCT CASE WHEN p.status = 'accepted' THEN i.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT i.id)::NUMERIC, 0) * 100,
    2
  ) AS acceptance_rate_pct
FROM inquiries i
LEFT JOIN proposals p ON i.proposal_id = p.id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY i.project_type
ORDER BY acceptance_rate_pct DESC;
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE inquiries IS 'Customer inquiries submitted via website quiz/form';
COMMENT ON TABLE proposals IS 'Proposals sent to customers with pricing and project details';
COMMENT ON TABLE proposal_feedback IS 'Customer feedback and change requests for proposals';
COMMENT ON TABLE inquiry_notes IS 'Internal admin notes for tracking inquiry progress';

COMMENT ON COLUMN inquiries.inquiry_number IS 'Human-readable inquiry ID (e.g., INQ-2025-001)';
COMMENT ON COLUMN inquiries.status IS 'Current inquiry status in the workflow pipeline';
COMMENT ON COLUMN inquiries.reference_links IS 'Array of URLs to example videos provided by customer';

COMMENT ON COLUMN proposals.review_token IS 'UUID for secure, passwordless customer access to proposal';
COMMENT ON COLUMN proposals.total_price IS 'Total proposal price in smallest currency unit (paise for INR, cents for USD) to avoid floating point errors';
COMMENT ON COLUMN proposals.currency IS 'ISO 4217 currency code - supports INR and USD for Razorpay payment processing';
COMMENT ON COLUMN proposals.payment_link IS 'Razorpay Payment Link URL (rzp.io/i/...) with inquiry metadata in notes field';
COMMENT ON COLUMN proposals.pricing_breakdown IS 'JSONB array of line items with descriptions and amounts';
COMMENT ON COLUMN proposals.deliverables IS 'JSONB array of deliverable objects with estimates';
COMMENT ON COLUMN proposals.milestones IS 'JSONB array of project milestones grouping deliverables';
COMMENT ON COLUMN proposals.version IS 'Proposal version number, increments with each revision';

COMMENT ON FUNCTION generate_inquiry_number() IS 'Generates next inquiry number in format INQ-YYYY-NNN';
COMMENT ON FUNCTION generate_proposal_number() IS 'Generates next proposal number in format PROP-YYYY-NNN';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
