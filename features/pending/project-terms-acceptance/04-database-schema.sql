-- ============================================================================
-- Project Terms & Acceptance - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: November 13, 2025
--
-- This schema defines the tables needed for the Project Terms & Acceptance
-- feature (US-025, US-026), including:
-- - project_terms: Terms content, versioning, and status
-- - project_terms_acceptance: Audit trail of client acceptances
-- - project_terms_revisions: Change requests from clients
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROJECT_TERMS TABLE
-- ============================================================================
-- Stores project terms with versioning support. Each project has one active
-- terms record. When admin updates terms, version increments and previous
-- acceptance is invalidated.

CREATE TABLE IF NOT EXISTS project_terms (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Terms Content (JSON for flexibility)
  content JSONB NOT NULL,

  -- Metadata
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  last_modified_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  changes_summary TEXT,

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('pending_review', 'revision_requested', 'accepted')
  ),
  CONSTRAINT valid_version CHECK (version >= 1),
  CONSTRAINT unique_project_version UNIQUE (project_id, version)
);

-- Indexes for performance
CREATE INDEX idx_project_terms_project_id ON project_terms(project_id);
CREATE INDEX idx_project_terms_status ON project_terms(status);
CREATE INDEX idx_project_terms_version ON project_terms(project_id, version DESC);
CREATE INDEX idx_project_terms_created_at ON project_terms(created_at DESC);
CREATE INDEX idx_project_terms_content ON project_terms USING GIN (content);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_terms_updated_at
  BEFORE UPDATE ON project_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_project_terms_updated_at();

-- ============================================================================
-- PROJECT_TERMS_ACCEPTANCE TABLE
-- ============================================================================
-- Audit trail of terms acceptances. Each time a client accepts terms, a new
-- record is created with full audit information (IP, user agent, timestamp).

CREATE TABLE IF NOT EXISTS project_terms_acceptance (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_terms_id UUID NOT NULL REFERENCES project_terms(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  terms_version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Acceptance Details
  accepted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,

  -- Metadata
  notes TEXT,

  -- Constraints
  CONSTRAINT valid_terms_version CHECK (terms_version >= 1),
  CONSTRAINT unique_acceptance_per_version UNIQUE (project_terms_id, accepted_by)
);

-- Indexes for performance
CREATE INDEX idx_terms_acceptance_project_terms_id ON project_terms_acceptance(project_terms_id);
CREATE INDEX idx_terms_acceptance_project_id ON project_terms_acceptance(project_id);
CREATE INDEX idx_terms_acceptance_accepted_by ON project_terms_acceptance(accepted_by);
CREATE INDEX idx_terms_acceptance_accepted_at ON project_terms_acceptance(accepted_at DESC);
CREATE INDEX idx_terms_acceptance_terms_version ON project_terms_acceptance(project_id, terms_version);

-- ============================================================================
-- PROJECT_TERMS_REVISIONS TABLE
-- ============================================================================
-- Tracks change requests from clients. When a client requests modifications
-- to terms, a revision request is created. Admin can respond by updating
-- terms or sending a message.

CREATE TABLE IF NOT EXISTS terms_change_requests (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_terms_id UUID NOT NULL REFERENCES project_terms(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Request Details
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  requested_changes TEXT NOT NULL,
  additional_context TEXT,
  terms_version INTEGER NOT NULL,

  -- Response
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  responded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  responded_at TIMESTAMP WITH TIME ZONE,
  admin_response TEXT,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,

  -- Constraints
  CONSTRAINT valid_change_request_status CHECK (
    status IN ('pending', 'under_review', 'addressed', 'declined')
  ),
  CONSTRAINT valid_requested_changes_length CHECK (
    char_length(requested_changes) >= 10 AND char_length(requested_changes) <= 1000
  ),
  CONSTRAINT valid_additional_context_length CHECK (
    additional_context IS NULL OR char_length(additional_context) <= 500
  ),
  CONSTRAINT valid_terms_version CHECK (terms_version >= 1)
);

COMMENT ON TABLE terms_change_requests IS 'Client requests for changes to project contract terms. Distinct from deliverable_revision_requests which are content edits to deliverables.';

-- Indexes for performance
CREATE INDEX idx_terms_change_requests_project_terms_id ON terms_change_requests(project_terms_id);
CREATE INDEX idx_terms_change_requests_project_id ON terms_change_requests(project_id);
CREATE INDEX idx_terms_change_requests_requested_by ON terms_change_requests(requested_by);
CREATE INDEX idx_terms_change_requests_status ON terms_change_requests(status);
CREATE INDEX idx_terms_change_requests_resolved ON terms_change_requests(resolved);
CREATE INDEX idx_terms_change_requests_created_at ON terms_change_requests(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_terms_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_terms_change_requests_updated_at
  BEFORE UPDATE ON terms_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_terms_change_requests_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if project terms are accepted
CREATE OR REPLACE FUNCTION is_project_terms_accepted(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  terms_status VARCHAR(50);
BEGIN
  SELECT status INTO terms_status
  FROM project_terms
  WHERE project_id = p_project_id
  ORDER BY version DESC
  LIMIT 1;

  RETURN terms_status = 'accepted';
END;
$$ LANGUAGE plpgsql;

-- Function to get current terms version for a project
CREATE OR REPLACE FUNCTION get_current_terms_version(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_version INTEGER;
BEGIN
  SELECT version INTO current_version
  FROM project_terms
  WHERE project_id = p_project_id
  ORDER BY version DESC
  LIMIT 1;

  RETURN COALESCE(current_version, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is authorized to accept terms (must be primary contact)
CREATE OR REPLACE FUNCTION can_accept_terms(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_primary BOOLEAN;
BEGIN
  SELECT is_primary_contact INTO is_primary
  FROM project_team
  WHERE project_id = p_project_id
    AND user_id = p_user_id
    AND role = 'client';

  RETURN COALESCE(is_primary, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Uncomment below to insert sample data for testing

/*
-- Sample project terms
INSERT INTO project_terms (
  id,
  project_id,
  version,
  status,
  content,
  created_by,
  last_modified_by,
  changes_summary
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '660e8400-e29b-41d4-a716-446655440001'::UUID,
  1,
  'pending_review',
  '{
    "projectName": "Brand Video Campaign Q1 2025",
    "clientName": "Acme Corp",
    "startDate": "2025-01-15",
    "endDate": "2025-03-30",
    "scope": {
      "inclusions": [
        "3 promotional videos (30 seconds each)",
        "Professional voiceover recording",
        "Background music licensing"
      ],
      "exclusions": [
        "On-location filming",
        "Custom music composition"
      ]
    },
    "deliverables": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440003",
        "name": "Promotional Video #1",
        "description": "Product showcase video",
        "format": "MP4, 1080p, 30fps",
        "dueDate": "2025-02-15"
      }
    ],
    "revisionPolicy": {
      "totalRevisions": 3,
      "description": "3 revisions included"
    },
    "timeline": {
      "duration": "11 weeks",
      "checkIns": "Tuesdays at 2:00 PM EST",
      "finalDeadline": "2025-03-30"
    },
    "pricing": {
      "total": 1500000,
      "currency": "USD",
      "paymentSchedule": [
        {
          "description": "50% deposit",
          "amount": 750000,
          "dueCondition": "Upon acceptance"
        }
      ]
    }
  }'::JSONB,
  '770e8400-e29b-41d4-a716-446655440002'::UUID,
  '770e8400-e29b-41d4-a716-446655440002'::UUID,
  NULL
);
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_terms IS 'Stores project terms with versioning. Each update increments version and requires re-acceptance.';
COMMENT ON COLUMN project_terms.status IS 'Current status: pending_review, revision_requested, or accepted';
COMMENT ON COLUMN project_terms.version IS 'Version number, starts at 1, increments on updates';
COMMENT ON COLUMN project_terms.content IS 'JSONB containing all terms: scope, deliverables, pricing, timeline';
COMMENT ON COLUMN project_terms.accepted_at IS 'Timestamp when client accepted (null if not accepted)';

COMMENT ON TABLE project_terms_acceptance IS 'Audit trail of terms acceptances with IP address and user agent for compliance';
COMMENT ON COLUMN project_terms_acceptance.ip_address IS 'Client IP address at time of acceptance (for audit trail)';
COMMENT ON COLUMN project_terms_acceptance.user_agent IS 'Browser user agent at time of acceptance (for audit trail)';

COMMENT ON TABLE project_terms_revisions IS 'Change requests from clients when they want modifications to terms';
COMMENT ON COLUMN project_terms_revisions.requested_changes IS 'Required field: what client wants changed (10-1000 chars)';
COMMENT ON COLUMN project_terms_revisions.status IS 'Request status: pending, under_review, addressed, or declined';
COMMENT ON COLUMN project_terms_revisions.resolved IS 'True if admin has addressed the request (either updated terms or declined)';

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Get all pending revision requests
-- SELECT * FROM project_terms_revisions WHERE status = 'pending' ORDER BY created_at ASC;

-- Get acceptance history for a project
-- SELECT * FROM project_terms_acceptance WHERE project_id = '<uuid>' ORDER BY accepted_at DESC;

-- Get current terms status for all projects
-- SELECT p.id, p.name, pt.version, pt.status, pt.accepted_at
-- FROM projects p
-- LEFT JOIN project_terms pt ON pt.project_id = p.id
-- WHERE pt.version = (SELECT MAX(version) FROM project_terms WHERE project_id = p.id);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
