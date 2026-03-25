-- ============================================================================
-- Core Task Management - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: November 15, 2025
--
-- This schema defines the tables needed for Core Task Management.
-- It integrates with existing portal tables: projects, deliverables, users,
-- files, and activities.
-- ============================================================================

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
-- Stores all tasks within project deliverables
-- Tasks can be client-visible or internal-only
-- Supports multi-assignee and follower workflows

CREATE TABLE IF NOT EXISTS tasks (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Task Details
  title VARCHAR(255) NOT NULL,
  description TEXT,  -- Markdown supported
  delivery_notes TEXT,  -- Added when status → awaiting_approval
  delivery_notes_updated_at TIMESTAMP WITH TIME ZONE,

  -- Workflow
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  visibility VARCHAR(50) NOT NULL DEFAULT 'client_visible',

  -- Scheduling
  deadline TIMESTAMP WITH TIME ZONE,

  -- Status Timestamps (for analytics and state tracking)
  pending_since TIMESTAMP WITH TIME ZONE,
  in_progress_since TIMESTAMP WITH TIME ZONE,
  awaiting_approval_since TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revision_requested_at TIMESTAMP WITH TIME ZONE,
  revision_requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revision_feedback TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Soft Delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_task_status CHECK (
    status IN (
      'pending',
      'in_progress',
      'awaiting_approval',
      'approved',
      'revision_requested',
      'completed'
    )
  ),
  CONSTRAINT valid_task_visibility CHECK (
    visibility IN ('client_visible', 'internal_only')
  ),
  CONSTRAINT delivery_notes_time_constraint CHECK (
    delivery_notes_updated_at IS NULL OR
    delivery_notes_updated_at <= CURRENT_TIMESTAMP
  )
);

-- Indexes for performance
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_deliverable_id ON tasks(deliverable_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_visibility ON tasks(visibility);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_deadline ON tasks(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_tasks_updated_at ON tasks(updated_at DESC);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;

-- Full-text search index on title and description
CREATE INDEX idx_tasks_search ON tasks
  USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Trigger to set status timestamps
CREATE OR REPLACE FUNCTION update_tasks_status_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Track when task enters each status
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'pending' THEN
        NEW.pending_since = CURRENT_TIMESTAMP;
      WHEN 'in_progress' THEN
        NEW.in_progress_since = CURRENT_TIMESTAMP;
      WHEN 'awaiting_approval' THEN
        NEW.awaiting_approval_since = CURRENT_TIMESTAMP;
      WHEN 'approved' THEN
        NEW.approved_at = CURRENT_TIMESTAMP;
      WHEN 'revision_requested' THEN
        NEW.revision_requested_at = CURRENT_TIMESTAMP;
      WHEN 'completed' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
      ELSE
        -- Do nothing for other statuses
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_status_timestamps
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.status != OLD.status)
  EXECUTE FUNCTION update_tasks_status_timestamps();

-- ============================================================================
-- TASK_ASSIGNMENTS TABLE
-- ============================================================================
-- Tracks task assignments (many-to-many: tasks ↔ users)
-- A task can have multiple assignees, a user can be assigned to multiple tasks

CREATE TABLE IF NOT EXISTS task_assignments (
  -- Core
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Metadata
  self_assigned BOOLEAN NOT NULL DEFAULT false,

  -- Prevent duplicate assignments
  CONSTRAINT unique_task_user_assignment UNIQUE (task_id, user_id)
);

-- Indexes
CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id ON task_assignments(user_id);
CREATE INDEX idx_task_assignments_assigned_at ON task_assignments(assigned_at DESC);

-- Trigger: Auto-add assignee as follower when assigned
CREATE OR REPLACE FUNCTION auto_follow_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Add user as follower if not already following
  INSERT INTO task_followers (task_id, user_id, source, can_unfollow)
  VALUES (NEW.task_id, NEW.user_id, 'assignment', false)
  ON CONFLICT (task_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_follow_on_assignment
  AFTER INSERT ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_follow_on_assignment();

-- ============================================================================
-- TASK_FOLLOWERS TABLE
-- ============================================================================
-- Tracks users following tasks for notifications (many-to-many)
-- Followers receive notifications for status changes, comments, etc.

CREATE TABLE IF NOT EXISTS task_followers (
  -- Core
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Metadata
  source VARCHAR(50) NOT NULL DEFAULT 'manual',  -- How they became a follower
  can_unfollow BOOLEAN NOT NULL DEFAULT true,  -- False if assigned
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,  -- Allow muting notifications

  -- Prevent duplicate followers
  CONSTRAINT unique_task_user_follower UNIQUE (task_id, user_id),
  CONSTRAINT valid_follower_source CHECK (
    source IN ('assignment', 'creator', 'comment', 'manual')
  )
);

-- Indexes
CREATE INDEX idx_task_followers_task_id ON task_followers(task_id);
CREATE INDEX idx_task_followers_user_id ON task_followers(user_id);
CREATE INDEX idx_task_followers_followed_at ON task_followers(followed_at DESC);

-- ============================================================================
-- TASK_COMMENTS TABLE
-- ============================================================================
-- NOTE: The task_comments table is defined in the feedback-and-revisions schema
-- See: features/feedback-and-revisions/04-database-schema.sql
--
-- The canonical definition includes more comprehensive features:
-- - Author name and role caching
-- - Reply count tracking
-- - Raw text storage
-- - Project ID for cross-referencing
--
-- This schema references that table via triggers below.
--
-- Canonical columns: id, task_id, project_id, created_at, updated_at,
-- text, raw_text, author_id, author_name, author_role, is_edited, edited_at,
-- is_deleted, deleted_at, deleted_by, mentioned_user_ids, reply_count

-- Trigger: Auto-add commenter as follower
-- This trigger references the task_comments table defined in feedback-and-revisions
CREATE OR REPLACE FUNCTION auto_follow_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Add commenter as follower if not already following
  INSERT INTO task_followers (task_id, user_id, source, can_unfollow)
  VALUES (NEW.task_id, NEW.author_id, 'comment', true)
  ON CONFLICT (task_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_follow_on_comment
  AFTER INSERT ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION auto_follow_on_comment();

-- ============================================================================
-- TASK ACTIVITIES (extends existing activities table)
-- ============================================================================
-- Activity log entries for tasks
-- This extends the global activities table with task-specific activity types

-- Add task-related activity types to activities table
-- Note: This assumes an existing activities table structure
-- If activities table doesn't exist, uncomment the CREATE TABLE below

/*
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  activity_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  visible_to_client BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_activities_project_id ON activities(project_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_metadata ON activities USING GIN (metadata);
*/

-- Task-specific activity types that will be used:
-- 'task_created', 'task_updated', 'task_assigned', 'task_unassigned',
-- 'task_followed', 'task_unfollowed', 'status_changed',
-- 'delivery_notes_added', 'delivery_notes_updated', 'comment_added',
-- 'comment_edited', 'comment_deleted', 'file_attached', 'deadline_updated',
-- 'task_deleted', 'task_restored'

-- ============================================================================
-- VIEWS FOR CONVENIENCE
-- ============================================================================

-- View: Tasks with computed fields
CREATE OR REPLACE VIEW tasks_with_computed AS
SELECT
  t.*,
  -- Computed fields
  (t.deleted_at IS NULL) AS is_active,
  (t.deadline IS NOT NULL AND t.deadline < CURRENT_TIMESTAMP AND t.status != 'completed') AS is_overdue,
  CASE
    WHEN t.deadline IS NOT NULL THEN
      EXTRACT(DAY FROM (t.deadline - CURRENT_TIMESTAMP))::INT
    ELSE NULL
  END AS days_until_deadline,
  (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id AND deleted_at IS NULL) AS comment_count,
  (SELECT COUNT(*) FROM task_assignments WHERE task_id = t.id) AS assignee_count,
  (SELECT COUNT(*) FROM task_followers WHERE task_id = t.id) AS follower_count,
  -- Delivery notes editability (1 hour window)
  (
    t.delivery_notes_updated_at IS NOT NULL AND
    t.delivery_notes_updated_at > (CURRENT_TIMESTAMP - INTERVAL '1 hour')
  ) AS delivery_notes_editable
FROM tasks t;

-- View: Task assignments with user details (denormalized for performance)
CREATE OR REPLACE VIEW task_assignments_with_users AS
SELECT
  ta.*,
  u.name AS user_name,
  u.email AS user_email,
  u.role AS user_role
FROM task_assignments ta
JOIN users u ON ta.user_id = u.id;

-- View: Task followers with user details
CREATE OR REPLACE VIEW task_followers_with_users AS
SELECT
  tf.*,
  u.name AS user_name,
  u.email AS user_email,
  u.role AS user_role
FROM task_followers tf
JOIN users u ON tf.user_id = u.id;

-- View: Task comments with user details
CREATE OR REPLACE VIEW task_comments_with_users AS
SELECT
  tc.*,
  u.name AS user_name,
  u.email AS user_email,
  u.role AS user_role
FROM task_comments tc
JOIN users u ON tc.created_by = u.id
WHERE tc.deleted_at IS NULL;

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Function: Get task completion percentage for a deliverable
CREATE OR REPLACE FUNCTION get_deliverable_task_completion_pct(deliverable_uuid UUID)
RETURNS INT AS $$
DECLARE
  total_tasks INT;
  completed_tasks INT;
BEGIN
  SELECT COUNT(*) INTO total_tasks
  FROM tasks
  WHERE deliverable_id = deliverable_uuid AND deleted_at IS NULL;

  IF total_tasks = 0 THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO completed_tasks
  FROM tasks
  WHERE deliverable_id = deliverable_uuid
    AND status = 'completed'
    AND deleted_at IS NULL;

  RETURN (completed_tasks * 100 / total_tasks)::INT;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user's assigned tasks count
CREATE OR REPLACE FUNCTION get_user_assigned_tasks_count(user_uuid UUID, proj_id UUID DEFAULT NULL)
RETURNS INT AS $$
DECLARE
  task_count INT;
BEGIN
  IF proj_id IS NULL THEN
    -- Count across all projects
    SELECT COUNT(DISTINCT ta.task_id) INTO task_count
    FROM task_assignments ta
    JOIN tasks t ON ta.task_id = t.id
    WHERE ta.user_id = user_uuid
      AND t.deleted_at IS NULL
      AND t.status != 'completed';
  ELSE
    -- Count for specific project
    SELECT COUNT(DISTINCT ta.task_id) INTO task_count
    FROM task_assignments ta
    JOIN tasks t ON ta.task_id = t.id
    WHERE ta.user_id = user_uuid
      AND t.project_id = proj_id
      AND t.deleted_at IS NULL
      AND t.status != 'completed';
  END IF;

  RETURN task_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get user's followed tasks count
CREATE OR REPLACE FUNCTION get_user_followed_tasks_count(user_uuid UUID, proj_id UUID DEFAULT NULL)
RETURNS INT AS $$
DECLARE
  task_count INT;
BEGIN
  IF proj_id IS NULL THEN
    SELECT COUNT(DISTINCT tf.task_id) INTO task_count
    FROM task_followers tf
    JOIN tasks t ON tf.task_id = t.id
    WHERE tf.user_id = user_uuid
      AND t.deleted_at IS NULL;
  ELSE
    SELECT COUNT(DISTINCT tf.task_id) INTO task_count
    FROM task_followers tf
    JOIN tasks t ON tf.task_id = t.id
    WHERE tf.user_id = user_uuid
      AND t.project_id = proj_id
      AND t.deleted_at IS NULL;
  END IF;

  RETURN task_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS ON TABLES AND COLUMNS
-- ============================================================================

COMMENT ON TABLE tasks IS 'Main task table for project deliverables. Supports multi-assignee, followers, and status workflow.';
COMMENT ON COLUMN tasks.status IS 'Current workflow status: pending, in_progress, awaiting_approval, approved, revision_requested, completed';
COMMENT ON COLUMN tasks.visibility IS 'Determines who can see the task: client_visible or internal_only';
COMMENT ON COLUMN tasks.delivery_notes IS 'Notes added by team when submitting task for client approval';
COMMENT ON COLUMN tasks.delivery_notes_updated_at IS 'Timestamp of last delivery notes update (editable for 1 hour)';

COMMENT ON TABLE task_assignments IS 'Many-to-many relationship between tasks and assigned users';
COMMENT ON COLUMN task_assignments.self_assigned IS 'True if user assigned themselves to the task';

COMMENT ON TABLE task_followers IS 'Users following tasks for notifications';
COMMENT ON COLUMN task_followers.source IS 'How user became follower: assignment, creator, comment, or manual';
COMMENT ON COLUMN task_followers.can_unfollow IS 'False for assigned users (must unassign first)';

COMMENT ON TABLE task_comments IS 'Comments and discussion threads on tasks';
COMMENT ON COLUMN task_comments.mentions IS 'Array of user UUIDs mentioned with @username syntax';

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Insert sample task (uncomment for development)
/*
INSERT INTO tasks (
  id, project_id, deliverable_id, created_by,
  title, description, status, visibility, deadline
) VALUES (
  gen_random_uuid(),
  'project-uuid-here',
  'deliverable-uuid-here',
  'user-uuid-here',
  'Video editing - Scene 2 color grading',
  'Adjust color grading in scene 2 to match brand guidelines',
  'in_progress',
  'client_visible',
  CURRENT_TIMESTAMP + INTERVAL '7 days'
);
*/

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- IMPORTANT: Run these migrations in order:
-- 1. Ensure projects, deliverables, users, files tables exist
-- 2. Create tasks table
-- 3. Create task_assignments table with auto-follow trigger
-- 4. Create task_followers table
-- 5. Create task_comments table with auto-follow trigger
-- 6. Create views
-- 7. Create utility functions

-- To rollback (in reverse order):
-- DROP FUNCTION IF EXISTS get_user_followed_tasks_count(UUID, UUID);
-- DROP FUNCTION IF EXISTS get_user_assigned_tasks_count(UUID, UUID);
-- DROP FUNCTION IF EXISTS get_deliverable_task_completion_pct(UUID);
-- DROP VIEW IF EXISTS task_comments_with_users;
-- DROP VIEW IF EXISTS task_followers_with_users;
-- DROP VIEW IF EXISTS task_assignments_with_users;
-- DROP VIEW IF EXISTS tasks_with_computed;
-- DROP TABLE IF EXISTS task_comments CASCADE;
-- DROP TABLE IF EXISTS task_followers CASCADE;
-- DROP TABLE IF EXISTS task_assignments CASCADE;
-- DROP TABLE IF EXISTS tasks CASCADE;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
