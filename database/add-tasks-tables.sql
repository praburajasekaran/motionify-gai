-- Migration: Add Tasks and Task Comments tables
-- Date: 2026-01-03
-- Purpose: Enable task persistence for portal application

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,

  -- Core task information
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',

  -- Visibility and linking
  visible_to_client BOOLEAN DEFAULT true,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL,

  -- Assignment and timeline
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deadline DATE,
  delivery TEXT, -- Link or description of delivered work

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CHECK (status IN ('pending', 'in_progress', 'awaiting_approval', 'completed', 'revision_requested'))
);

-- ============================================================================
-- TASK_COMMENTS TABLE
-- ============================================================================
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,

  -- Comment content
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL, -- Denormalized for display
  content TEXT NOT NULL,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tasks indexes
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_deliverable ON tasks(deliverable_id);

-- Task comments indexes
CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_created ON task_comments(created_at);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

-- Note: The update_updated_at_column() function should already exist from schema.sql
-- If not, uncomment the following:
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VALIDATION
-- ============================================================================

-- Verify tables created successfully
SELECT
  'Tasks and task_comments tables created successfully!' as message,
  COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('tasks', 'task_comments');
