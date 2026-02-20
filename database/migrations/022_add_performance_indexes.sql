-- Migration 022: Add performance indexes
-- Adds missing indexes on high-traffic foreign key columns and filter columns
-- These were absent from the initial schema and cause full table scans at scale

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_stage ON tasks(stage);

-- Activities (queried heavily by project and sorted by date)
CREATE INDEX IF NOT EXISTS idx_activities_project_id ON activities(project_id);
CREATE INDEX IF NOT EXISTS idx_activities_inquiry_id ON activities(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);

-- Project Team (joined on every project detail fetch)
CREATE INDEX IF NOT EXISTS idx_project_team_project_id ON project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user_id ON project_team(user_id);

-- Deliverable Files
CREATE INDEX IF NOT EXISTS idx_deliverable_files_deliverable_id ON deliverable_files(deliverable_id);

-- Rate limit entries (cleanup query scans this column on every API call)
CREATE INDEX IF NOT EXISTS idx_rate_limit_created_at ON rate_limit_entries(created_at);
