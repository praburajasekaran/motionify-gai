-- Migration 025: Add project terms acceptance fields
-- The app records when a client accepts project terms directly on projects.
-- These columns existed in database/schema.sql but were missing from the
-- incremental migration chain used by deployed databases.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS terms_accepted_by UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS terms_ip_address VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_projects_terms_accepted_at
  ON projects(terms_accepted_at)
  WHERE terms_accepted_at IS NOT NULL;

COMMENT ON COLUMN projects.terms_accepted_at IS 'Timestamp when the client accepted the project terms';
COMMENT ON COLUMN projects.terms_accepted_by IS 'User who accepted the project terms';
COMMENT ON COLUMN projects.terms_ip_address IS 'Client IP address captured when project terms were accepted';
