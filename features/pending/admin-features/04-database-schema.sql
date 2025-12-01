-- ============================================================================
-- Admin Features - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: November 17, 2025
--
-- This schema enhances existing tables and adds new tables for admin features:
-- - User management with soft delete
-- - Comprehensive activity logging
-- - Session tracking for security
-- ============================================================================

-- ============================================================================
-- USERS TABLE (ENHANCED)
-- ============================================================================
-- Existing table with additional fields for admin features

-- Add new columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add check constraint for status values
ALTER TABLE users ADD CONSTRAINT valid_user_status CHECK (
  status IN ('pending_activation', 'active', 'deactivated')
);

-- Create indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON users(deactivated_at DESC) WHERE deactivated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Add comment
COMMENT ON COLUMN users.is_active IS 'False when user is deactivated (soft delete)';
COMMENT ON COLUMN users.status IS 'User activation status: pending_activation, active, or deactivated';
COMMENT ON COLUMN users.deactivated_at IS 'Timestamp when user was deactivated';
COMMENT ON COLUMN users.deactivated_by IS 'UUID of admin who deactivated this user';
COMMENT ON COLUMN users.deactivation_reason IS 'Optional reason for deactivation';

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
-- NOTE: The activities table is defined in the core-foundation schema
-- See: features/core-foundation/04-database-schema.sql
--
-- The activities table is a foundational table used by all features for audit logging.
-- All user actions across the system are logged to this table.
--
-- Core columns: id, project_id, user_id, action_type, entity_type, entity_id,
-- description, details (JSONB), ip_address, user_agent, timestamp
--
-- The log_activity() helper function is also defined in core-foundation schema.

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
-- NOTE: The sessions table is defined in the authentication-system schema
-- See: features/authentication-system/04-database-schema.sql
--
-- Session management for user authentication and security tracking.
-- Includes password reset tokens and email verification tokens.
--
-- Core functions available:
-- - invalidate_user_sessions(user_id) - Invalidate all sessions for a user
-- - cleanup_expired_sessions() - Clean up expired sessions
-- - has_valid_session(user_id) - Check if user has valid session

-- ============================================================================
-- PROJECTS TABLE (ENHANCED)
-- ============================================================================
-- Add status tracking fields to existing projects table

ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'in_progress';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- Add check constraint for status values
ALTER TABLE projects ADD CONSTRAINT valid_project_status CHECK (
  status IN ('in_progress', 'completed', 'on_hold', 'archived')
);

-- Create indexes for project status queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_status_changed_at ON projects(status_changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_archived_at ON projects(archived_at DESC) WHERE archived_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN projects.status IS 'Project lifecycle status: in_progress, completed, on_hold, or archived';
COMMENT ON COLUMN projects.status_changed_at IS 'Timestamp of last status change';
COMMENT ON COLUMN projects.status_changed_by IS 'UUID of admin who changed the status';
COMMENT ON COLUMN projects.completed_at IS 'Timestamp when project was marked as completed';
COMMENT ON COLUMN projects.archived_at IS 'Timestamp when project was archived';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- NOTE: invalidate_user_sessions() function is defined in authentication-system schema
-- See: features/authentication-system/04-database-schema.sql

-- NOTE: log_activity() function is defined in core-foundation schema
-- See: features/core-foundation/04-database-schema.sql

-- Function to count active super admins (prevent deactivating last admin)
CREATE OR REPLACE FUNCTION count_active_super_admins()
RETURNS INTEGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO admin_count
  FROM users
  WHERE role = 'super_admin'
    AND is_active = true
    AND status = 'active';

  RETURN admin_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION count_active_super_admins IS 'Returns count of active super admins (for validation)';

-- Function to check if status transition is valid
CREATE OR REPLACE FUNCTION is_valid_project_status_transition(
  current_status VARCHAR,
  new_status VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE current_status
    WHEN 'in_progress' THEN new_status IN ('completed', 'on_hold')
    WHEN 'on_hold' THEN new_status IN ('in_progress', 'completed')
    WHEN 'completed' THEN new_status IN ('archived', 'in_progress')
    WHEN 'archived' THEN false
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_valid_project_status_transition IS 'Validates project status transitions';

-- NOTE: cleanup_expired_sessions() function is defined in authentication-system schema
-- See: features/authentication-system/04-database-schema.sql

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to automatically log user deactivation
CREATE OR REPLACE FUNCTION trigger_log_user_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if is_active changed from true to false
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Find a project for this user to log against (use first project they're on)
    DECLARE
      user_project_id UUID;
    BEGIN
      SELECT project_id INTO user_project_id
      FROM project_team
      WHERE user_id = NEW.id
      LIMIT 1;

      -- Only log if user is on at least one project
      IF user_project_id IS NOT NULL THEN
        PERFORM log_activity(
          user_project_id,
          NEW.deactivated_by,
          'user_deactivated',
          'user',
          NEW.id,
          format('User deactivated: %s (%s)', NEW.full_name, NEW.role),
          jsonb_build_object(
            'entityName', NEW.full_name,
            'oldRole', NEW.role,
            'deactivationReason', NEW.deactivation_reason,
            'historicalDataPreserved', true
          )
        );
      END IF;
    END;

    -- Invalidate all user sessions
    PERFORM invalidate_user_sessions(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_deactivation
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_user_deactivation();

COMMENT ON TRIGGER trigger_users_deactivation ON users IS 'Automatically logs user deactivation and invalidates sessions';

-- Trigger to log project status changes
CREATE OR REPLACE FUNCTION trigger_log_project_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_activity(
      NEW.id,
      NEW.status_changed_by,
      'project_status_changed',
      'project',
      NEW.id,
      format('Project status changed: %s (%s → %s)', NEW.name, OLD.status, NEW.status),
      jsonb_build_object(
        'entityName', NEW.name,
        'oldStatus', OLD.status,
        'newStatus', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_status_change
  AFTER UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_project_status_change();

COMMENT ON TRIGGER trigger_projects_status_change ON projects IS 'Automatically logs project status changes';

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Sample super admin user (only insert if no super admins exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'super_admin') THEN
    INSERT INTO users (
      email,
      full_name,
      role,
      is_active,
      status,
      created_at
    ) VALUES (
      'admin@motionify.studio',
      'System Administrator',
      'super_admin',
      true,
      'active',
      CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for active users with last activity
CREATE OR REPLACE VIEW v_active_users AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_active,
  u.status,
  u.created_at,
  u.last_login_at,
  COUNT(DISTINCT pt.project_id) AS project_count,
  MAX(a.timestamp) AS last_activity_at
FROM users u
LEFT JOIN project_team pt ON u.id = pt.user_id
LEFT JOIN activities a ON u.id = a.user_id
WHERE u.is_active = true AND u.status = 'active'
GROUP BY u.id;

COMMENT ON VIEW v_active_users IS 'Active users with project count and last activity timestamp';

-- View for recent activities with user details
CREATE OR REPLACE VIEW v_recent_activities AS
SELECT
  a.id,
  a.project_id,
  p.name AS project_name,
  a.user_id,
  u.full_name AS user_name,
  u.role AS user_role,
  u.is_active AS user_is_active,
  a.action_type,
  a.entity_type,
  a.entity_id,
  a.description,
  a.details,
  a.timestamp
FROM activities a
JOIN users u ON a.user_id = u.id
JOIN projects p ON a.project_id = p.id
ORDER BY a.timestamp DESC;

COMMENT ON VIEW v_recent_activities IS 'Recent activities with user and project details for easy querying';

-- View for project status summary
CREATE OR REPLACE VIEW v_project_status_summary AS
SELECT
  status,
  COUNT(*) AS project_count,
  COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') AS created_last_30_days,
  COUNT(*) FILTER (WHERE status_changed_at > CURRENT_TIMESTAMP - INTERVAL '7 days') AS status_changed_last_7_days
FROM projects
GROUP BY status;

COMMENT ON VIEW v_project_status_summary IS 'Summary of projects by status with recent change counts';

-- ============================================================================
-- PERMISSIONS (adjust based on your application user setup)
-- ============================================================================

-- Grant appropriate permissions
-- GRANT SELECT, INSERT, UPDATE ON activities TO app_user;
-- GRANT SELECT, UPDATE ON users TO app_user;
-- GRANT SELECT, UPDATE ON projects TO app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO app_user;
-- GRANT EXECUTE ON FUNCTION log_activity TO app_user;
-- GRANT EXECUTE ON FUNCTION count_active_super_admins TO app_user;
-- GRANT EXECUTE ON FUNCTION is_valid_project_status_transition TO app_user;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
