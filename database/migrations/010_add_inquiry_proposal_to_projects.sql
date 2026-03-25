-- Migration: Add inquiry_id and proposal_id to projects table
-- Created: 2026-01-28
-- Purpose: Add missing foreign key columns for linking projects to inquiries and proposals

-- UP

-- Add inquiry_id column if not exists
ALTER TABLE projects ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES inquiries(id);

-- Add proposal_id column if not exists
ALTER TABLE projects ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id);

-- Create indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_projects_inquiry_id ON projects(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_projects_proposal_id ON projects(proposal_id);

-- DOWN
-- ALTER TABLE projects DROP COLUMN IF EXISTS inquiry_id;
-- ALTER TABLE projects DROP COLUMN IF EXISTS proposal_id;
-- DROP INDEX IF EXISTS idx_projects_inquiry_id;
-- DROP INDEX IF EXISTS idx_projects_proposal_id;
