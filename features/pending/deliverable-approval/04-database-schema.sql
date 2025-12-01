-- ============================================================================
-- Project Deliverables & Approval Workflow - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: 2025-01-13
--
-- This schema defines the tables needed for deliverable approval workflow.
-- It integrates with existing portal tables: projects, users, files, activities
-- ============================================================================

-- ============================================================================
-- DELIVERABLES TABLE
-- ============================================================================
-- NOTE: The deliverables table is defined in the core-foundation schema
-- See: features/core-foundation/04-database-schema.sql
--
-- The deliverables table is a foundational table referenced by multiple features:
-- - core-task-management (tasks.deliverable_id)
-- - feedback-and-revisions (revision_requests.deliverable_id)
-- - file-management (files.deliverable_id)
-- - deliverable-approval (this schema - for approval workflow)
--
-- Core columns: id, project_id, created_at, updated_at, name, description,
-- estimated_completion_week, format, status, display_order, beta_file_id,
-- beta_uploaded_at, beta_uploaded_by, awaiting_approval_since, approved_at,
-- approved_by, rejected_at, rejected_by, rejection_feedback, final_file_id,
-- final_uploaded_at, final_uploaded_by, final_delivered_at, expires_at,
-- balance_payment_required, balance_payment_received, balance_payment_received_at,
-- revisions_consumed
--
-- Triggers and functions for deliverable expiry are defined in core-foundation schema.

-- ============================================================================
-- DELIVERABLE_APPROVALS TABLE
-- ============================================================================
-- Audit trail of all approval/rejection actions for deliverables

CREATE TABLE IF NOT EXISTS deliverable_approvals (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Action Details
  action VARCHAR(20) NOT NULL,  -- 'approved' or 'rejected'
  action_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_by_name VARCHAR(255) NOT NULL,  -- Cached for history
  action_by_email VARCHAR(255) NOT NULL,  -- Cached for history

  -- Rejection Details (null if approved)
  feedback TEXT,
  revisions_remaining INT,  -- Project revision quota at time of action

  -- Context
  beta_file_id UUID REFERENCES files(id) ON DELETE SET NULL,
  beta_file_url TEXT,  -- Cached URL for audit trail

  -- Constraints
  CONSTRAINT valid_action CHECK (action IN ('approved', 'rejected')),
  CONSTRAINT feedback_required_for_rejection CHECK (
    (action = 'rejected' AND feedback IS NOT NULL) OR (action = 'approved')
  )
);

-- Indexes
CREATE INDEX idx_deliverable_approvals_deliverable ON deliverable_approvals(deliverable_id);
CREATE INDEX idx_deliverable_approvals_project ON deliverable_approvals(project_id);
CREATE INDEX idx_deliverable_approvals_created_at ON deliverable_approvals(created_at DESC);

-- ============================================================================
-- ADDITIONAL_REVISION_REQUESTS TABLE
-- ============================================================================
-- Tracks requests for additional revisions when quota is exhausted
-- NOTE: This is DIFFERENT from revision_requests in feedback-and-revisions
-- - feedback-and-revisions: revision_requests = actual revisions that consume quota
-- - deliverable-approval: additional_revision_requests = requests for MORE quota

CREATE TABLE IF NOT EXISTS additional_revision_requests (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Request Details
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  additional_revisions_requested INT NOT NULL,

  -- Admin Response
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMP WITH TIME ZONE,
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_notes TEXT,

  -- If Approved
  revisions_granted INT,

  -- Constraints
  CONSTRAINT valid_additional_revision_request_status CHECK (
    status IN ('pending', 'approved', 'rejected')
  ),
  CONSTRAINT valid_additional_revisions_requested CHECK (
    additional_revisions_requested > 0 AND additional_revisions_requested <= 10
  )
);

-- Indexes
CREATE INDEX idx_additional_revision_requests_project ON additional_revision_requests(project_id);
CREATE INDEX idx_additional_revision_requests_status ON additional_revision_requests(status);
CREATE INDEX idx_additional_revision_requests_deliverable ON additional_revision_requests(deliverable_id)
  WHERE deliverable_id IS NOT NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_additional_revision_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_additional_revision_requests_updated_at
  BEFORE UPDATE ON additional_revision_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_additional_revision_requests_updated_at();

-- ============================================================================
-- DELIVERABLE_FILES VIEW
-- ============================================================================
-- This view shows files associated with deliverables
-- The files table (defined in core-foundation) includes deliverable_id column

-- View for easy querying of deliverable files
CREATE OR REPLACE VIEW deliverable_files AS
SELECT 
  f.id,
  f.deliverable_id,
  d.project_id,
  f.file_name,
  f.file_size,
  f.mime_type,
  f.storage_key,
  f.storage_url,
  f.file_type,
  f.is_watermarked,
  f.uploaded_by,
  f.uploaded_at,
  f.created_at,
  d.expires_at as access_expires_at,
  CASE 
    WHEN d.expires_at IS NOT NULL AND d.expires_at < CURRENT_TIMESTAMP THEN false
    ELSE true
  END as is_accessible
FROM files f
JOIN deliverables d ON f.deliverable_id = d.id
WHERE f.deliverable_id IS NOT NULL;

-- ============================================================================
-- ACTIVITY LOG INTEGRATION
-- ============================================================================
-- Add new activity types for deliverable workflow
-- (Assuming activities table exists with type column)

COMMENT ON TABLE deliverables IS 'Project deliverables with approval workflow tracking';
COMMENT ON TABLE deliverable_approvals IS 'Audit trail of deliverable approvals and rejections';
COMMENT ON TABLE revision_requests IS 'Requests for additional revisions beyond quota';

-- New activity types to be logged:
-- - DELIVERABLE_CREATED
-- - DELIVERABLE_BETA_UPLOADED
-- - DELIVERABLE_AWAITING_APPROVAL
-- - DELIVERABLE_APPROVED
-- - DELIVERABLE_REJECTED
-- - DELIVERABLE_FINAL_UPLOADED
-- - DELIVERABLE_FINAL_DELIVERED
-- - DELIVERABLE_EXPIRED
-- - REVISION_REQUEST_CREATED
-- - REVISION_REQUEST_APPROVED
-- - REVISION_REQUEST_REJECTED

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can approve deliverable
CREATE OR REPLACE FUNCTION can_approve_deliverable(
  p_deliverable_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_primary_contact BOOLEAN;
  v_status VARCHAR(50);
BEGIN
  -- Check if user is PRIMARY_CONTACT for this project
  SELECT EXISTS (
    SELECT 1 FROM project_team pt
    JOIN deliverables d ON d.project_id = pt.project_id
    WHERE d.id = p_deliverable_id
    AND pt.user_id = p_user_id
    AND pt.is_primary_contact = true
  ) INTO v_is_primary_contact;

  -- Check deliverable status
  SELECT status INTO v_status FROM deliverables WHERE id = p_deliverable_id;

  RETURN v_is_primary_contact AND v_status = 'awaiting_approval';
END;
$$ LANGUAGE plpgsql;

-- Function to check revision quota availability
CREATE OR REPLACE FUNCTION has_revisions_available(
  p_project_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_total INT;
  v_used INT;
BEGIN
  SELECT total_revisions, used_revisions 
  INTO v_total, v_used
  FROM projects 
  WHERE id = p_project_id;

  RETURN v_used < v_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Commented out - uncomment for development
/*
INSERT INTO deliverables (
  id, project_id, name, description, status, display_order,
  balance_payment_required, balance_payment_received
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM projects LIMIT 1),
  'Script & Concept',
  'Approved script and creative concept document',
  'pending',
  1,
  true,
  false
);
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
