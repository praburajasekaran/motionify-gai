-- Migration: Create project_files table
-- Stores metadata for files uploaded to the project Files tab.
-- Actual file data lives in R2; this table tracks the reference.

CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),           -- MIME type e.g. 'video/mp4'
  file_size BIGINT,                 -- Size in bytes
  r2_key TEXT NOT NULL,             -- R2 storage key
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_files_project_id ON project_files(project_id);
