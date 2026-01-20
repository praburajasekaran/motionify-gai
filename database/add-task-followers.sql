-- Migration: Add Task Followers table
-- Date: 2026-01-08
-- Purpose: Enable users to follow tasks and receive notifications

-- ============================================================================
-- TASK_FOLLOWERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure a user can only follow a task once
  UNIQUE(task_id, user_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_task_followers_task ON task_followers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_followers_user ON task_followers(user_id);

-- ============================================================================
-- VALIDATION
-- ============================================================================
SELECT
  'task_followers table created successfully!' as message,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'task_followers';
