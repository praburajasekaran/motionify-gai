-- Notifications Table Migration
-- Purpose: Add notifications table for in-app notifications

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR(500),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  
  -- Constraints for valid notification types
  CONSTRAINT valid_notification_type CHECK (
    type IN (
      'task_assigned', 'task_status_changed', 'comment_mention',
      'file_uploaded', 'approval_request', 'revision_requested',
      'payment_received', 'team_member_added', 'project_status_changed'
    )
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON notifications(project_id);

-- Insert some sample notifications for testing (optional - can be removed in production)
-- These will only insert if the referenced users/projects exist
DO $$
DECLARE
  v_user_id UUID;
  v_project_id UUID;
BEGIN
  -- Try to get the first user
  SELECT id INTO v_user_id FROM users LIMIT 1;
  
  -- Try to get the first project
  SELECT id INTO v_project_id FROM projects LIMIT 1;
  
  -- Only insert sample data if we have both a user and a project
  IF v_user_id IS NOT NULL AND v_project_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, project_id, type, title, message, is_read, actor_name, created_at)
    VALUES 
      (v_user_id, v_project_id, 'task_assigned', 'New Task Assigned', 
       'You have been assigned to "Create storyboard for Brand Video"', 
       false, 'Sarah Mitchell', NOW() - INTERVAL '5 minutes'),
      (v_user_id, v_project_id, 'comment_mention', 'You were mentioned', 
       '@you was mentioned in a comment on "Script Review"', 
       false, 'Alex Client', NOW() - INTERVAL '30 minutes'),
      (v_user_id, v_project_id, 'approval_request', 'Approval Requested', 
       'Brand Video Draft is ready for your review', 
       false, 'Dana S', NOW() - INTERVAL '2 hours'),
      (v_user_id, v_project_id, 'revision_requested', 'Revision Requested', 
       'Client requested changes on "Main Video" deliverable', 
       true, 'Alex Client', NOW() - INTERVAL '1 day'),
      (v_user_id, v_project_id, 'payment_received', 'Payment Received', 
       'Advance payment of $2,500 received for Brand Video project', 
       true, NULL, NOW() - INTERVAL '2 days')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
