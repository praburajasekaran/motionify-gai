-- ============================================================================
-- Notifications System - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: November 17, 2025
--
-- This schema defines the tables needed for the Notifications System feature.
-- Supports in-app notifications, email notifications, and user preferences.
-- ============================================================================

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- Stores all in-app notifications for users

CREATE TABLE IF NOT EXISTS notifications (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Notification Content
  title VARCHAR(100) NOT NULL,
  message VARCHAR(500) NOT NULL,
  icon VARCHAR(50) NOT NULL,

  -- Action/Navigation
  action_url VARCHAR(500),
  action_label VARCHAR(50),

  -- Metadata (JSON)
  metadata JSONB DEFAULT '{}',

  -- Actor Information
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),

  -- Constraints
  CONSTRAINT valid_notification_type CHECK (
    type IN (
      'task_assigned', 'task_status_changed', 'task_comment_added',
      'comment_mention', 'comment_reply',
      'file_uploaded', 'file_comment_added',
      'approval_request', 'approval_granted', 'revision_requested', 'revision_completed',
      'team_member_added', 'team_member_removed',
      'project_created', 'project_status_changed', 'terms_accepted', 'terms_updated'
    )
  ),
  CONSTRAINT valid_notification_category CHECK (
    category IN (
      'task_updates', 'comments_mentions', 'file_updates',
      'approvals_revisions', 'team_changes', 'project_updates'
    )
  )
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_project_id ON notifications(project_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_category ON notifications(category);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read_at ON notifications(read_at DESC) WHERE read_at IS NOT NULL;
CREATE INDEX idx_notifications_actor_id ON notifications(actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_notifications_metadata ON notifications USING GIN (metadata);

-- Composite indexes for common queries
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) 
  WHERE read = FALSE AND deleted_at IS NULL;
CREATE INDEX idx_notifications_user_project ON notifications(user_id, project_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Comment on table
COMMENT ON TABLE notifications IS 'Stores all in-app notifications for users with metadata and action links';
COMMENT ON COLUMN notifications.metadata IS 'JSON metadata with task_id, file_id, comment_id, etc.';
COMMENT ON COLUMN notifications.deleted_at IS 'Soft delete timestamp - notifications auto-deleted after 90 days';

-- ============================================================================
-- USER_NOTIFICATION_PREFERENCES TABLE
-- ============================================================================
-- Stores user preferences for notification delivery per category

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Preferences (JSON array of category settings)
  preferences JSONB DEFAULT '[]',

  -- Global Settings
  email_batching_frequency VARCHAR(20) DEFAULT 'every_5_min',
  paused_until TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_email_batching_frequency CHECK (
    email_batching_frequency IN ('immediately', 'every_5_min', 'hourly', 'daily')
  ),
  CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create indexes
CREATE INDEX idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_preferences_paused ON user_notification_preferences(paused_until) 
  WHERE paused_until IS NOT NULL;

-- Comment on table
COMMENT ON TABLE user_notification_preferences IS 'User preferences for in-app and email notifications per category';
COMMENT ON COLUMN user_notification_preferences.preferences IS 'JSON array: [{"category": "task_updates", "inAppEnabled": true, "emailEnabled": true}, ...]';
COMMENT ON COLUMN user_notification_preferences.paused_until IS 'Temporary pause notifications (vacation mode)';

-- ============================================================================
-- NOTIFICATION_EMAIL_QUEUE TABLE
-- ============================================================================
-- Queue for batching and sending email notifications

CREATE TABLE IF NOT EXISTS notification_email_queue (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending',

  -- Email Content
  notification_ids UUID[] NOT NULL,
  email_type VARCHAR(20) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,

  -- Delivery Tracking
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  ses_message_id VARCHAR(255),

  -- Constraints
  CONSTRAINT valid_email_queue_status CHECK (
    status IN ('pending', 'batched', 'sending', 'sent', 'failed', 'abandoned')
  ),
  CONSTRAINT valid_email_type CHECK (
    email_type IN ('individual', 'digest')
  ),
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= 10),
  CONSTRAINT non_empty_notification_ids CHECK (array_length(notification_ids, 1) > 0)
);

-- Create indexes for performance
CREATE INDEX idx_email_queue_user_id ON notification_email_queue(user_id);
CREATE INDEX idx_email_queue_status ON notification_email_queue(status);
CREATE INDEX idx_email_queue_scheduled_for ON notification_email_queue(scheduled_for) 
  WHERE status IN ('pending', 'batched');
CREATE INDEX idx_email_queue_created_at ON notification_email_queue(created_at DESC);
CREATE INDEX idx_email_queue_retry ON notification_email_queue(retry_count, status) 
  WHERE status = 'failed';

-- Composite index for batch processing
CREATE INDEX idx_email_queue_pending_batch ON notification_email_queue(user_id, scheduled_for)
  WHERE status = 'pending';

-- Comment on table
COMMENT ON TABLE notification_email_queue IS 'Queue for batching and sending email notifications via Amazon SES';
COMMENT ON COLUMN notification_email_queue.notification_ids IS 'Array of notification UUIDs included in this email';
COMMENT ON COLUMN notification_email_queue.scheduled_for IS 'When to send email (for batching - typically now + 2-5 minutes)';
COMMENT ON COLUMN notification_email_queue.retry_count IS 'Number of send attempts (max 3 before abandoned)';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update updated_at timestamp on user_notification_preferences
CREATE OR REPLACE FUNCTION update_user_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_notification_preferences_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = p_user_id
      AND read = FALSE
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_unread_notification_count IS 'Returns count of unread notifications for a user';

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE,
      read_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id
    AND read = FALSE
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all unread notifications as read for a user, returns count';

-- Function to auto-expire old unread notifications (7 days)
CREATE OR REPLACE FUNCTION auto_expire_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE,
      read_at = CURRENT_TIMESTAMP
  WHERE read = FALSE
    AND deleted_at IS NULL
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_expire_old_notifications IS 'Auto-marks unread notifications as read after 7 days';

-- Function to cleanup old notifications (90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE notifications
  SET deleted_at = CURRENT_TIMESTAMP
  WHERE deleted_at IS NULL
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_notifications IS 'Soft-deletes notifications older than 90 days';

-- Function to get or create user notification preferences
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(p_user_id UUID)
RETURNS user_notification_preferences AS $$
DECLARE
  prefs user_notification_preferences;
BEGIN
  SELECT * INTO prefs
  FROM user_notification_preferences
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO user_notification_preferences (user_id, preferences)
    VALUES (
      p_user_id,
      '[
        {"category": "task_updates", "inAppEnabled": true, "emailEnabled": true},
        {"category": "comments_mentions", "inAppEnabled": true, "emailEnabled": true},
        {"category": "file_updates", "inAppEnabled": true, "emailEnabled": false},
        {"category": "approvals_revisions", "inAppEnabled": true, "emailEnabled": true},
        {"category": "team_changes", "inAppEnabled": true, "emailEnabled": true},
        {"category": "project_updates", "inAppEnabled": true, "emailEnabled": false}
      ]'::jsonb
    )
    RETURNING * INTO prefs;
  END IF;
  
  RETURN prefs;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_notification_preferences IS 'Returns user preferences or creates default if not exists';

-- Function to check if email should be sent for notification type
CREATE OR REPLACE FUNCTION should_send_email(
  p_user_id UUID,
  p_category VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
  email_enabled BOOLEAN;
BEGIN
  SELECT 
    COALESCE(
      (preferences @> jsonb_build_array(
        jsonb_build_object('category', p_category, 'emailEnabled', true)
      )),
      FALSE
    ) INTO email_enabled
  FROM user_notification_preferences
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(email_enabled, FALSE);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION should_send_email IS 'Checks user preferences to determine if email should be sent for a notification category';

-- Function to calculate scheduled send time for notification emails (clock-aligned batching)
CREATE OR REPLACE FUNCTION calculate_email_scheduled_for(
  p_frequency VARCHAR(20),
  p_user_timezone VARCHAR(50),
  p_notification_type VARCHAR(100) DEFAULT NULL
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE;
  v_next_send TIMESTAMP WITH TIME ZONE;
  v_current_minute INT;
  v_next_mark INT;
BEGIN
  -- High-priority notifications sent immediately (bypass batching)
  IF p_notification_type IN (
    'comment_mention',
    'approval_request',
    'revision_requested',
    'project_created'
  ) THEN
    RETURN CURRENT_TIMESTAMP;
  END IF;

  -- Get current time in user's timezone
  v_now := CURRENT_TIMESTAMP AT TIME ZONE p_user_timezone;

  CASE p_frequency
    WHEN 'immediate' THEN
      RETURN CURRENT_TIMESTAMP;

    WHEN 'every_5_min' THEN
      -- Round up to next 5-minute mark (00, 05, 10, 15... 55)
      v_current_minute := EXTRACT(MINUTE FROM v_now)::INT;
      v_next_mark := CEIL(v_current_minute / 5.0) * 5;

      IF v_next_mark = 60 THEN
        -- Roll over to next hour
        RETURN date_trunc('hour', v_now) + INTERVAL '1 hour';
      ELSE
        RETURN date_trunc('hour', v_now) + (v_next_mark || ' minutes')::INTERVAL;
      END IF;

    WHEN 'hourly' THEN
      -- Next hour top (e.g., if 3:43 PM → 4:00 PM)
      RETURN date_trunc('hour', v_now) + INTERVAL '1 hour';

    WHEN 'daily' THEN
      -- Next 9 AM in user's timezone
      IF EXTRACT(HOUR FROM v_now) >= 9 THEN
        -- After 9 AM today, schedule for 9 AM tomorrow
        RETURN (date_trunc('day', v_now) + INTERVAL '1 day' + INTERVAL '9 hours');
      ELSE
        -- Before 9 AM today, schedule for 9 AM today
        RETURN (date_trunc('day', v_now) + INTERVAL '9 hours');
      END IF;

    WHEN 'never' THEN
      RETURN NULL;

    ELSE
      -- Default to hourly if unknown frequency
      RETURN date_trunc('hour', v_now) + INTERVAL '1 hour';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_email_scheduled_for IS 'Calculate clock-aligned send time based on user batching preference. See EMAIL_BATCHING_ALGORITHM.md for details.';

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Uncomment to insert sample data
/*
-- Insert default preferences for a sample user
INSERT INTO user_notification_preferences (user_id, preferences)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '[
    {"category": "task_updates", "inAppEnabled": true, "emailEnabled": true},
    {"category": "comments_mentions", "inAppEnabled": true, "emailEnabled": true},
    {"category": "file_updates", "inAppEnabled": true, "emailEnabled": false},
    {"category": "approvals_revisions", "inAppEnabled": true, "emailEnabled": true},
    {"category": "team_changes", "inAppEnabled": true, "emailEnabled": true},
    {"category": "project_updates", "inAppEnabled": true, "emailEnabled": false}
  ]'::jsonb
);

-- Insert sample notifications
INSERT INTO notifications (
  user_id, project_id, type, category, title, message, icon,
  action_url, action_label, metadata, actor_id, actor_name
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'task_assigned',
    'task_updates',
    'Task Assigned',
    'You were assigned to ''Create storyboard concepts'' by Mike Johnson',
    '🎯',
    '/projects/22222222-2222-2222-2222-222222222222/tasks/33333333-3333-3333-3333-333333333333',
    'View Task',
    '{"taskId": "33333333-3333-3333-3333-333333333333", "taskTitle": "Create storyboard concepts", "projectName": "Brand Video Campaign"}'::jsonb,
    '44444444-4444-4444-4444-444444444444',
    'Mike Johnson'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'comment_mention',
    'comments_mentions',
    'Mentioned',
    'Sarah mentioned you in a comment',
    '💬',
    '/projects/22222222-2222-2222-2222-222222222222/tasks/33333333-3333-3333-3333-333333333333#comment-55555555',
    'View Comment',
    '{"taskId": "33333333-3333-3333-3333-333333333333", "commentId": "55555555-5555-5555-5555-555555555555", "mentionedBy": "Sarah Williams"}'::jsonb,
    '66666666-6666-6666-6666-666666666666',
    'Sarah Williams'
  );
*/

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Get notification statistics
-- SELECT
--   type,
--   COUNT(*) as total,
--   COUNT(*) FILTER (WHERE read = TRUE) as read_count,
--   COUNT(*) FILTER (WHERE read = FALSE) as unread_count
-- FROM notifications
-- WHERE deleted_at IS NULL
-- GROUP BY type
-- ORDER BY total DESC;

-- Get email queue statistics
-- SELECT
--   status,
--   COUNT(*) as total,
--   AVG(retry_count) as avg_retries
-- FROM notification_email_queue
-- GROUP BY status
-- ORDER BY total DESC;

-- Find users with most unread notifications
-- SELECT
--   u.full_name,
--   u.email,
--   COUNT(*) as unread_count
-- FROM notifications n
-- JOIN users u ON n.user_id = u.id
-- WHERE n.read = FALSE AND n.deleted_at IS NULL
-- GROUP BY u.id, u.full_name, u.email
-- ORDER BY unread_count DESC
-- LIMIT 10;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
