-- ============================================================================
-- Feedback & Revisions System - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: November 15, 2025
--
-- This schema defines all tables for comments, revision requests, and
-- additional revision management.
-- ============================================================================

-- ============================================================================
-- TASK_COMMENTS TABLE
-- ============================================================================
-- Stores comments on tasks for feedback and discussion

CREATE TABLE IF NOT EXISTS task_comments (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Content
  text TEXT NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 5000),
  raw_text TEXT NOT NULL,  -- Original unprocessed text

  -- Author
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(255) NOT NULL,  -- Cached from users table
  author_role VARCHAR(50) NOT NULL,

  -- Editing
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,

  -- Deletion (soft delete)
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Mentions
  mentioned_user_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Counts
  reply_count INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_author_role CHECK (
    author_role IN ('client', 'project_manager', 'super_admin')
  )
);

-- Indexes for performance
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_project_id ON task_comments(project_id);
CREATE INDEX idx_task_comments_author_id ON task_comments(author_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);
CREATE INDEX idx_task_comments_deleted ON task_comments(is_deleted) WHERE is_deleted = FALSE;

-- ============================================================================
-- FILE_COMMENTS TABLE
-- ============================================================================
-- Stores comments on files for feedback on specific assets

CREATE TABLE IF NOT EXISTS file_comments (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Content
  text TEXT NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 5000),
  raw_text TEXT NOT NULL,

  -- Threading support
  parent_comment_id UUID REFERENCES file_comments(id) ON DELETE CASCADE,

  -- Timestamp reference (for video/audio)
  timestamp VARCHAR(10),  -- e.g., "00:42" or "1:15"
  timestamp_seconds INTEGER,  -- Seconds for programmatic use

  -- Author
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  author_name VARCHAR(255) NOT NULL,
  author_role VARCHAR(50) NOT NULL,

  -- Editing
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP WITH TIME ZONE,

  -- Deletion (soft delete)
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Mentions
  mentioned_user_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Counts
  reply_count INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_author_role CHECK (
    author_role IN ('client', 'project_manager', 'super_admin')
  ),
  CONSTRAINT valid_timestamp CHECK (
    timestamp IS NULL OR timestamp ~ '^\d{1,2}:\d{2}$'
  )
);

-- Indexes
CREATE INDEX idx_file_comments_file_id ON file_comments(file_id);
CREATE INDEX idx_file_comments_project_id ON file_comments(project_id);
CREATE INDEX idx_file_comments_author_id ON file_comments(author_id);
CREATE INDEX idx_file_comments_created_at ON file_comments(created_at DESC);
CREATE INDEX idx_file_comments_deleted ON file_comments(is_deleted) WHERE is_deleted = FALSE;

-- ============================================================================
-- COMMENT_MENTIONS TABLE
-- ============================================================================
-- Tracks @mentions in comments for notification dispatch

CREATE TABLE IF NOT EXISTS comment_mentions (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL,  -- Can reference task_comments OR file_comments
  comment_type VARCHAR(10) NOT NULL,  -- 'task' or 'file'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Mentioned User
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioned_user_name VARCHAR(255) NOT NULL,
  mention_text VARCHAR(255) NOT NULL,  -- e.g., "@JohnDoe"

  -- Context
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,  -- NULL if file comment
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,  -- NULL if task comment

  -- Notification Status
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_comment_type CHECK (comment_type IN ('task', 'file')),
  CONSTRAINT valid_context CHECK (
    (comment_type = 'task' AND task_id IS NOT NULL AND file_id IS NULL) OR
    (comment_type = 'file' AND file_id IS NOT NULL AND task_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_comment_mentions_comment ON comment_mentions(comment_type, comment_id);
CREATE INDEX idx_comment_mentions_user ON comment_mentions(mentioned_user_id);
CREATE INDEX idx_comment_mentions_project ON comment_mentions(project_id);
CREATE INDEX idx_comment_mentions_notification ON comment_mentions(notification_sent);

-- ============================================================================
-- REVISION_REQUESTS TABLE
-- ============================================================================
-- Formal revision requests that consume project-level revision quota

CREATE TABLE IF NOT EXISTS deliverable_revision_requests (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Request Details
  feedback TEXT NOT NULL CHECK (char_length(feedback) >= 50 AND char_length(feedback) <= 5000),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  requested_by_name VARCHAR(255) NOT NULL,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Reference Files
  reference_file_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Quota Impact
  revision_number INTEGER NOT NULL,  -- 1, 2, 3...
  quota_before_total INTEGER NOT NULL,
  quota_before_used INTEGER NOT NULL,
  quota_after_total INTEGER NOT NULL,
  quota_after_used INTEGER NOT NULL,

  -- Resolution
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  CONSTRAINT valid_revision_number CHECK (revision_number > 0),
  CONSTRAINT valid_quota_impact CHECK (
    quota_after_used = quota_before_used + 1
  )
);

COMMENT ON TABLE deliverable_revision_requests IS 'Client requests for changes/revisions to a specific deliverable (e.g., video edits). Distinct from terms_change_requests which are contract modifications.';

-- Indexes
CREATE INDEX idx_deliverable_revision_requests_project ON deliverable_revision_requests(project_id);
CREATE INDEX idx_deliverable_revision_requests_deliverable ON deliverable_revision_requests(deliverable_id);
CREATE INDEX idx_deliverable_revision_requests_status ON deliverable_revision_requests(status);
CREATE INDEX idx_deliverable_revision_requests_created ON deliverable_revision_requests(created_at DESC);

-- ============================================================================
-- ADDITIONAL_REVISION_REQUESTS TABLE
-- ============================================================================
-- Requests for additional revisions when project quota is exhausted

CREATE TABLE IF NOT EXISTS additional_revision_requests (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Request Details
  requested_count INTEGER NOT NULL CHECK (requested_count >= 1 AND requested_count <= 5),
  reason TEXT NOT NULL CHECK (char_length(reason) >= 100 AND char_length(reason) <= 2000),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  requested_by_name VARCHAR(255) NOT NULL,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  -- Context at Time of Request
  quota_snapshot_total INTEGER NOT NULL,
  quota_snapshot_used INTEGER NOT NULL,
  quota_snapshot_remaining INTEGER NOT NULL DEFAULT 0,

  -- Review by Admin
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_name VARCHAR(255),

  -- Decision
  approved_count INTEGER CHECK (approved_count >= 1 AND approved_count <= 5),
  decline_reason TEXT,
  internal_notes TEXT,

  -- Constraints
  CONSTRAINT valid_status CHECK (
    status IN ('pending', 'approved', 'declined')
  ),
  CONSTRAINT valid_quota_exhausted CHECK (
    quota_snapshot_remaining = 0
  ),
  CONSTRAINT approved_has_count CHECK (
    (status = 'approved' AND approved_count IS NOT NULL) OR
    (status != 'approved')
  ),
  CONSTRAINT declined_has_reason CHECK (
    (status = 'declined' AND decline_reason IS NOT NULL) OR
    (status != 'declined')
  )
);

-- Indexes
CREATE INDEX idx_additional_revision_requests_project ON additional_revision_requests(project_id);
CREATE INDEX idx_additional_revision_requests_status ON additional_revision_requests(status);
CREATE INDEX idx_additional_revision_requests_created ON additional_revision_requests(created_at DESC);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Trigger for task_comments updated_at
CREATE OR REPLACE FUNCTION update_task_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_comments_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comments_updated_at();

-- Trigger for file_comments updated_at
CREATE OR REPLACE FUNCTION update_file_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_file_comments_updated_at
  BEFORE UPDATE ON file_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_file_comments_updated_at();

-- Trigger for revision_requests updated_at
CREATE OR REPLACE FUNCTION update_revision_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_revision_requests_updated_at
  BEFORE UPDATE ON revision_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_revision_requests_updated_at();

-- Trigger for additional_revision_requests updated_at
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
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE task_comments IS 'Comments on tasks for feedback and discussion';
COMMENT ON TABLE file_comments IS 'Comments on files for feedback on specific assets';
COMMENT ON TABLE comment_mentions IS 'Tracks @mentions in comments for notifications';
COMMENT ON TABLE revision_requests IS 'Formal revision requests that consume project quota';
COMMENT ON TABLE additional_revision_requests IS 'Requests for additional revisions when quota exhausted';

COMMENT ON COLUMN task_comments.mentioned_user_ids IS 'Array of UUIDs of @mentioned users';
COMMENT ON COLUMN task_comments.is_deleted IS 'Soft delete flag - comments are never hard deleted';
COMMENT ON COLUMN file_comments.timestamp IS 'Optional timestamp for video/audio comments (e.g., "00:42")';
COMMENT ON COLUMN revision_requests.revision_number IS 'Sequential number of this revision (1, 2, 3...)';
COMMENT ON COLUMN additional_revision_requests.quota_snapshot_remaining IS 'Should always be 0 at time of request';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
