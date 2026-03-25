-- ============================================================================
-- Task Following System - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: November 13, 2025
--
-- This schema defines the task_followers table for tracking which users
-- are following which tasks for notification purposes.
-- ============================================================================

-- ============================================================================
-- TASK_FOLLOWERS TABLE
-- ============================================================================
-- Stores the many-to-many relationship between users and tasks they follow.
-- Separate from task_assignments (which tracks responsibility).

CREATE TABLE IF NOT EXISTS task_followers (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Metadata
  followed_via VARCHAR(50) NOT NULL DEFAULT 'manual',
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,

  -- Constraints
  CONSTRAINT valid_followed_via CHECK (
    followed_via IN ('manual', 'auto_assigned', 'auto_created')
  ),
  CONSTRAINT unique_user_task_follow UNIQUE (user_id, task_id)
);

-- Indexes for performance
CREATE INDEX idx_task_followers_task_id ON task_followers(task_id);
CREATE INDEX idx_task_followers_user_id ON task_followers(user_id);
CREATE INDEX idx_task_followers_created_at ON task_followers(created_at DESC);
CREATE INDEX idx_task_followers_notifications ON task_followers(notifications_enabled) WHERE notifications_enabled = TRUE;

-- Composite index for common query pattern
CREATE INDEX idx_task_followers_user_task ON task_followers(user_id, task_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user is following a task
CREATE OR REPLACE FUNCTION is_following_task(p_user_id UUID, p_task_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM task_followers
    WHERE user_id = p_user_id AND task_id = p_task_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get follower count for a task
CREATE OR REPLACE FUNCTION get_follower_count(p_task_id UUID)
RETURNS INTEGER AS $$
DECLARE
  follower_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO follower_count
  FROM task_followers
  WHERE task_id = p_task_id;
  
  RETURN COALESCE(follower_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to auto-follow when assigned to task
CREATE OR REPLACE FUNCTION auto_follow_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-follow if not already following
  INSERT INTO task_followers (task_id, user_id, followed_via)
  VALUES (NEW.task_id, NEW.user_id, 'auto_assigned')
  ON CONFLICT (user_id, task_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-follow when assigned
CREATE TRIGGER trigger_auto_follow_on_assignment
  AFTER INSERT ON task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_follow_on_assignment();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE task_followers IS 'Tracks which users are following which tasks for notifications. Separate from assignments.';
COMMENT ON COLUMN task_followers.followed_via IS 'How the follow was created: manual, auto_assigned, or auto_created';
COMMENT ON COLUMN task_followers.notifications_enabled IS 'Whether user receives notifications for this task (allows muting)';

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Uncomment to insert sample data

/*
-- Sample follows
INSERT INTO task_followers (task_id, user_id, followed_via) VALUES
  ('task-uuid-1', 'user-uuid-1', 'manual'),
  ('task-uuid-1', 'user-uuid-2', 'auto_assigned'),
  ('task-uuid-2', 'user-uuid-1', 'manual');
*/

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Get all followers for a task
-- SELECT u.name, u.email, tf.followed_via, tf.created_at
-- FROM task_followers tf
-- JOIN users u ON u.id = tf.user_id
-- WHERE tf.task_id = 'task-uuid-here'
-- ORDER BY tf.created_at ASC;

-- Get all tasks a user is following
-- SELECT t.title, t.status, tf.created_at
-- FROM task_followers tf
-- JOIN tasks t ON t.id = tf.task_id
-- WHERE tf.user_id = 'user-uuid-here'
-- ORDER BY tf.created_at DESC;

-- Find tasks with most followers
-- SELECT t.title, COUNT(tf.id) as follower_count
-- FROM tasks t
-- LEFT JOIN task_followers tf ON tf.task_id = t.id
-- GROUP BY t.id, t.title
-- ORDER BY follower_count DESC
-- LIMIT 10;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
