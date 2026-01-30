-- ============================================================================
-- Migration: Create Activities Table
-- ============================================================================
-- This migration creates the activities table for tracking all user actions
-- across the platform (inquiries, proposals, projects, deliverables, etc.)
--
-- Created: 2026-01-29
-- Phase: 09-admin-features
-- ============================================================================

-- Activities table for tracking all user actions
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  target_user_id UUID REFERENCES users(id),
  target_user_name VARCHAR(255),
  inquiry_id UUID REFERENCES inquiries(id),
  proposal_id UUID REFERENCES proposals(id),
  project_id UUID REFERENCES projects(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on user_id for filtering by user
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);

-- Index on project_id for project activity logs
CREATE INDEX IF NOT EXISTS idx_activities_project ON activities(project_id);

-- Index on proposal_id for proposal activity logs
CREATE INDEX IF NOT EXISTS idx_activities_proposal ON activities(proposal_id);

-- Index on inquiry_id for inquiry activity logs
CREATE INDEX IF NOT EXISTS idx_activities_inquiry ON activities(inquiry_id);

-- Index on type for filtering by activity type
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);

-- Index on created_at for chronological sorting
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE activities IS 'Audit log for all user actions across inquiries, proposals, projects, and deliverables';
COMMENT ON COLUMN activities.type IS 'Activity type (e.g., INQUIRY_CREATED, PROPOSAL_SENT, PAYMENT_COMPLETED)';
COMMENT ON COLUMN activities.user_name IS 'Denormalized user name for read performance (avoids joins)';
COMMENT ON COLUMN activities.details IS 'JSON object with activity-specific metadata';
