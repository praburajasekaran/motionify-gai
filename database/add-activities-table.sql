-- Activities Table Migration
-- Purpose: Store activity logs for inquiries, proposals, and projects
-- This enables activity tracking before a project exists

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS activities CASCADE;

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Type of activity (matches ActivityType enum in types.ts)
  type VARCHAR(50) NOT NULL,

  -- Actor (who performed the action)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,

  -- Target (recipient of the action, for role-aware phrasing)
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_user_name VARCHAR(255),

  -- Contextual references (nullable - activity may relate to one or more)
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Activity-specific details (JSON)
  details JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints for valid activity types
  CONSTRAINT valid_activity_type CHECK (
    type IN (
      -- Task activities
      'TASK_STATUS_CHANGED', 'TASK_CREATED', 'TASK_UPDATED',
      'REVISION_REQUESTED', 'COMMENT_ADDED',
      -- File activities
      'FILE_UPLOADED', 'FILE_RENAMED', 'FILE_DOWNLOADED',
      -- Team activities
      'TEAM_MEMBER_INVITED', 'TEAM_MEMBER_REMOVED', 'TEAM_UPDATED',
      -- Proposal activities
      'PROPOSAL_SENT', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'PROPOSAL_CHANGES_REQUESTED',
      -- Deliverable activities
      'DELIVERABLE_APPROVED', 'DELIVERABLE_REJECTED', 'DELIVERABLE_UPLOADED',
      -- Payment activities
      'PAYMENT_RECEIVED', 'PAYMENT_REMINDER_SENT',
      -- Project activities
      'PROJECT_CREATED', 'TERMS_ACCEPTED'
    )
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activities_inquiry_id ON activities(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_activities_proposal_id ON activities(proposal_id);
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Composite index for fetching activities by context
CREATE INDEX IF NOT EXISTS idx_activities_context ON activities(inquiry_id, proposal_id, project_id, created_at DESC);

COMMENT ON TABLE activities IS 'Activity log for audit trail and activity feeds';
COMMENT ON COLUMN activities.type IS 'Activity type matching ActivityType enum';
COMMENT ON COLUMN activities.user_id IS 'User who performed the action';
COMMENT ON COLUMN activities.target_user_id IS 'User who is the recipient/target of the action';
COMMENT ON COLUMN activities.details IS 'JSON containing activity-specific data';
