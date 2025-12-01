-- ============================================================================
-- Team Management - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: November 16, 2025
--
-- This schema defines tables for:
-- - project_invitations: Token-based email invitations (US-021)
-- - project_team: Team members with soft delete (US-022)
-- ============================================================================

-- ============================================================================
-- PROJECT_INVITATIONS TABLE
-- ============================================================================
-- Stores email invitations sent to users to join project teams
-- Features:
-- - Unique secure token for acceptance links
-- - 7-day automatic expiration
-- - Status tracking (pending, accepted, expired, revoked)
-- - Resend capability with tracking

CREATE TABLE IF NOT EXISTS project_invitations (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) NOT NULL UNIQUE,              -- 32 bytes = 64 hex chars (crypto.randomBytes)
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,                -- Auto-set to created_at + 7 days

  -- Invitation Details
  email VARCHAR(255) NOT NULL,                     -- Email address of invitee
  personal_message TEXT,                           -- Optional message from inviter (max 500 chars)
  role VARCHAR(50) NOT NULL DEFAULT 'client',      -- Role to assign (client, project_manager)

  -- Relationships
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Acceptance Metadata (populated on acceptance)
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Revocation Metadata (populated on revocation)
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Resend Tracking
  resent_at TIMESTAMPTZ,
  resent_count INTEGER NOT NULL DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_invitation_status CHECK (
    status IN ('pending', 'accepted', 'expired', 'revoked')
  ),
  CONSTRAINT valid_invitation_role CHECK (
    role IN ('super_admin', 'project_manager', 'client')
    -- Note: super_admin invitations are rare; super admins typically have global access
  ),
  CONSTRAINT valid_personal_message_length CHECK (
    personal_message IS NULL OR length(personal_message) <= 500
  ),
  CONSTRAINT resent_count_non_negative CHECK (resent_count >= 0),

  -- Business logic constraints
  CONSTRAINT accepted_metadata CHECK (
    (status = 'accepted' AND accepted_at IS NOT NULL AND accepted_by IS NOT NULL) OR
    (status != 'accepted' AND accepted_at IS NULL AND accepted_by IS NULL)
  ),
  CONSTRAINT revoked_metadata CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL) OR
    (status != 'revoked' AND revoked_at IS NULL AND revoked_by IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX idx_project_invitations_email ON project_invitations(email);
CREATE INDEX idx_project_invitations_status ON project_invitations(status);
CREATE INDEX idx_project_invitations_token ON project_invitations(token); -- Unique, but explicit index for lookups
CREATE INDEX idx_project_invitations_expires_at ON project_invitations(expires_at);
CREATE INDEX idx_project_invitations_created_at ON project_invitations(created_at DESC);

-- Composite index for querying pending invitations by project
CREATE INDEX idx_project_invitations_project_status ON project_invitations(project_id, status)
  WHERE status = 'pending';

-- ============================================================================
-- PROJECT_TEAM TABLE
-- ============================================================================
-- Stores team members assigned to projects
-- Features:
-- - Soft delete with 90-day retention (US-022)
-- - Primary contact designation
-- - Role-based permissions
-- - Tracks invitation used to join (if applicable)

CREATE TABLE IF NOT EXISTS project_team (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

  -- Team Membership
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  added_by VARCHAR(255) NOT NULL,                 -- UUID of user OR 'system' (for invitation acceptance)
  invitation_id UUID REFERENCES project_invitations(id) ON DELETE SET NULL,

  -- Soft Delete (US-022: Data Retention)
  removed_at TIMESTAMPTZ,                          -- NULL if active, timestamp if removed
  removed_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_team_role CHECK (
    role IN ('super_admin', 'project_manager', 'client')
  ),
  CONSTRAINT unique_user_project UNIQUE (user_id, project_id),
  CONSTRAINT removed_metadata CHECK (
    (removed_at IS NOT NULL AND removed_by IS NOT NULL) OR
    (removed_at IS NULL AND removed_by IS NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_project_team_user_id ON project_team(user_id);
CREATE INDEX idx_project_team_project_id ON project_team(project_id);
CREATE INDEX idx_project_team_role ON project_team(role);
CREATE INDEX idx_project_team_is_primary_contact ON project_team(is_primary_contact)
  WHERE is_primary_contact = TRUE;
CREATE INDEX idx_project_team_removed_at ON project_team(removed_at);

-- Composite index for active team members by project
CREATE INDEX idx_project_team_project_active ON project_team(project_id, removed_at)
  WHERE removed_at IS NULL;

-- Composite index for soft-deleted members (for cleanup job)
CREATE INDEX idx_project_team_removed ON project_team(removed_at)
  WHERE removed_at IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Auto-update updated_at timestamp on project_invitations
CREATE OR REPLACE FUNCTION update_project_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_invitations_updated_at
  BEFORE UPDATE ON project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_project_invitations_updated_at();

-- Trigger: Auto-update updated_at timestamp on project_team
CREATE OR REPLACE FUNCTION update_project_team_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_project_team_updated_at
  BEFORE UPDATE ON project_team
  FOR EACH ROW
  EXECUTE FUNCTION update_project_team_updated_at();

-- Trigger: Auto-set expires_at on invitation creation (7 days from creation)
CREATE OR REPLACE FUNCTION set_invitation_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NEW.created_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invitation_expiry
  BEFORE INSERT ON project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION set_invitation_expiry();

-- Trigger: Auto-mark invitations as expired (run daily via cron job)
-- Note: This is implemented as a scheduled function, not a row-level trigger
CREATE OR REPLACE FUNCTION mark_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE project_invitations
  SET status = 'expired', updated_at = CURRENT_TIMESTAMP
  WHERE status = 'pending'
    AND expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Prevent duplicate invitations to same email for same project
CREATE OR REPLACE FUNCTION prevent_duplicate_invitation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's already a pending invitation
  IF EXISTS (
    SELECT 1 FROM project_invitations
    WHERE project_id = NEW.project_id
      AND email = NEW.email
      AND status = 'pending'
      AND id != COALESCE(NEW.id, gen_random_uuid())
  ) THEN
    RAISE EXCEPTION 'A pending invitation already exists for % on this project', NEW.email;
  END IF;

  -- Check if user is already a team member
  IF EXISTS (
    SELECT 1 FROM project_team pt
    JOIN users u ON pt.user_id = u.id
    WHERE pt.project_id = NEW.project_id
      AND u.email = NEW.email
      AND pt.removed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'User % is already a member of this project', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_duplicate_invitation
  BEFORE INSERT OR UPDATE ON project_invitations
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION prevent_duplicate_invitation();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Check if user can remove a team member
CREATE OR REPLACE FUNCTION can_remove_team_member(
  p_user_id UUID,
  p_project_id UUID,
  p_removed_by_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_member_role VARCHAR(50);
  v_is_primary BOOLEAN;
  v_remover_role VARCHAR(50);
  v_pm_count INTEGER;
BEGIN
  -- Get member details
  SELECT role, is_primary_contact
  INTO v_member_role, v_is_primary
  FROM project_team
  WHERE user_id = p_user_id
    AND project_id = p_project_id
    AND removed_at IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE; -- Member doesn't exist or already removed
  END IF;

  -- Cannot remove self
  IF p_user_id = p_removed_by_user_id THEN
    RETURN FALSE;
  END IF;

  -- Cannot remove primary contact
  IF v_is_primary = TRUE THEN
    RETURN FALSE;
  END IF;

  -- Cannot remove last project manager
  IF v_member_role = 'project_manager' THEN
    SELECT COUNT(*)
    INTO v_pm_count
    FROM project_team
    WHERE project_id = p_project_id
      AND role = 'project_manager'
      AND removed_at IS NULL;

    IF v_pm_count <= 1 THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Check if remover has permission (is primary contact or PM)
  SELECT role
  INTO v_remover_role
  FROM project_team
  WHERE user_id = p_removed_by_user_id
    AND project_id = p_project_id
    AND removed_at IS NULL
    AND (is_primary_contact = TRUE OR role IN ('super_admin', 'project_manager'));

  IF NOT FOUND THEN
    RETURN FALSE; -- Remover doesn't have permission
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Get active team members for a project
CREATE OR REPLACE FUNCTION get_active_team_members(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_email VARCHAR,
  user_name VARCHAR,
  role VARCHAR,
  is_primary_contact BOOLEAN,
  added_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pt.id,
    pt.user_id,
    u.email,
    u.name,
    pt.role,
    pt.is_primary_contact,
    pt.added_at
  FROM project_team pt
  JOIN users u ON pt.user_id = u.id
  WHERE pt.project_id = p_project_id
    AND pt.removed_at IS NULL
  ORDER BY
    pt.is_primary_contact DESC,
    CASE pt.role
      WHEN 'super_admin' THEN 1
      WHEN 'project_manager' THEN 2
      WHEN 'client' THEN 3
    END,
    pt.added_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get pending invitations for a project
CREATE OR REPLACE FUNCTION get_pending_invitations(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  personal_message TEXT,
  invited_by_name VARCHAR,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  resent_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pi.id,
    pi.email,
    pi.personal_message,
    u.name AS invited_by_name,
    pi.created_at,
    pi.expires_at,
    pi.resent_count
  FROM project_invitations pi
  JOIN users u ON pi.invited_by = u.id
  WHERE pi.project_id = p_project_id
    AND pi.status = 'pending'
  ORDER BY pi.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Accept invitation and create team member
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token VARCHAR(64),
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_invitation_id UUID;
  v_project_id UUID;
  v_role VARCHAR(50);
  v_team_member_id UUID;
BEGIN
  -- Get invitation details and validate
  SELECT id, project_id, role
  INTO v_invitation_id, v_project_id, v_role
  FROM project_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > CURRENT_TIMESTAMP;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid, expired, or already accepted invitation';
  END IF;

  -- Create team member
  INSERT INTO project_team (
    user_id,
    project_id,
    role,
    is_primary_contact,
    added_by,
    invitation_id
  ) VALUES (
    p_user_id,
    v_project_id,
    v_role,
    FALSE, -- Invitations never create primary contacts
    'system',
    v_invitation_id
  )
  RETURNING id INTO v_team_member_id;

  -- Mark invitation as accepted
  UPDATE project_invitations
  SET status = 'accepted',
      accepted_at = CURRENT_TIMESTAMP,
      accepted_by = p_user_id,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = v_invitation_id;

  RETURN v_team_member_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Remove team member (soft delete)
CREATE OR REPLACE FUNCTION remove_team_member(
  p_user_id UUID,
  p_project_id UUID,
  p_removed_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_removed_user_name VARCHAR(255);
  v_removed_user_email VARCHAR(255);
  v_removed_by_name VARCHAR(255);
  v_team_member_id UUID;
  v_member_role VARCHAR(100);
BEGIN
  -- Validate removal permission
  IF NOT can_remove_team_member(p_user_id, p_project_id, p_removed_by) THEN
    RAISE EXCEPTION 'You do not have permission to remove this team member';
  END IF;

  -- Get team member details before removal for activity logging
  SELECT pt.id, pt.role, u.full_name, u.email
  INTO v_team_member_id, v_member_role, v_removed_user_name, v_removed_user_email
  FROM project_team pt
  INNER JOIN users u ON u.id = pt.user_id
  WHERE pt.user_id = p_user_id
    AND pt.project_id = p_project_id
    AND pt.removed_at IS NULL;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get remover's name for activity description
  SELECT full_name INTO v_removed_by_name
  FROM users
  WHERE id = p_removed_by;

  -- Soft delete team member
  UPDATE project_team
  SET removed_at = CURRENT_TIMESTAMP,
      removed_by = p_removed_by,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id
    AND project_id = p_project_id
    AND removed_at IS NULL;

  -- Log activity
  PERFORM log_activity(
    p_project_id,
    p_removed_by,
    'team_member_removed',
    'team',
    v_team_member_id,
    v_removed_by_name || ' removed ' || v_removed_user_name || ' from project team',
    jsonb_build_object(
      'removedUserId', p_user_id,
      'removedUserName', v_removed_user_name,
      'removedUserEmail', v_removed_user_email,
      'role', v_member_role,
      'removedBy', v_removed_by_name
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup old soft-deleted team members (90 days retention)
CREATE OR REPLACE FUNCTION cleanup_removed_team_members()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM project_team
  WHERE removed_at IS NOT NULL
    AND removed_at < (CURRENT_TIMESTAMP - INTERVAL '90 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup old expired invitations (90 days retention)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM project_invitations
  WHERE status = 'expired'
    AND expires_at < (CURRENT_TIMESTAMP - INTERVAL '90 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Resend invitation (generates new token and resets expiry)
CREATE OR REPLACE FUNCTION resend_invitation(
  p_invitation_id UUID,
  p_new_token VARCHAR(64)  -- New token generated by application layer (crypto.randomBytes)
)
RETURNS VARCHAR(64) AS $$
DECLARE
  v_resent_count INTEGER;
BEGIN
  -- Token is generated in application layer with crypto.randomBytes
  -- This function accepts the pre-generated token and updates the database

  -- Validate token parameter
  IF p_new_token IS NULL OR char_length(p_new_token) <> 64 THEN
    RAISE EXCEPTION 'Invalid token: must be exactly 64 characters';
  END IF;

  -- Get current resent count
  SELECT resent_count INTO v_resent_count
  FROM project_invitations
  WHERE id = p_invitation_id
    AND status IN ('pending', 'expired');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already accepted/revoked';
  END IF;

  -- Check resend rate limit (max 3 per hour)
  IF EXISTS (
    SELECT 1 FROM project_invitations
    WHERE id = p_invitation_id
      AND resent_at > (CURRENT_TIMESTAMP - INTERVAL '1 hour')
      AND resent_count >= 3
  ) THEN
    RAISE EXCEPTION 'Too many resend attempts. Please wait 1 hour.';
  END IF;

  -- Update invitation with new token and reset expiry
  UPDATE project_invitations
  SET token = p_new_token,  -- Update with new token from application layer
      status = 'pending',
      expires_at = CURRENT_TIMESTAMP + INTERVAL '7 days',
      resent_at = CURRENT_TIMESTAMP,
      resent_count = resent_count + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_invitation_id;

  RETURN p_new_token;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE project_invitations IS 'Email invitations to join project teams with token-based acceptance';
COMMENT ON COLUMN project_invitations.token IS '64-char hex token (32 bytes from crypto.randomBytes)';
COMMENT ON COLUMN project_invitations.expires_at IS 'Auto-set to created_at + 7 days on insert';
COMMENT ON COLUMN project_invitations.status IS 'pending (awaiting), accepted (user joined), expired (>7 days), revoked (cancelled)';
COMMENT ON COLUMN project_invitations.resent_count IS 'Number of times invitation was resent (max 3/hour)';

COMMENT ON TABLE project_team IS 'Project team members with soft delete support (90-day retention)';
COMMENT ON COLUMN project_team.is_primary_contact IS 'Primary contact for project (only one per project, cannot be removed)';
COMMENT ON COLUMN project_team.added_by IS 'UUID of user who added them, or "system" for invitation acceptance';
COMMENT ON COLUMN project_team.removed_at IS 'Soft delete timestamp (NULL if active)';

COMMENT ON FUNCTION can_remove_team_member IS 'Validates business rules for team member removal';
COMMENT ON FUNCTION accept_invitation IS 'Accepts invitation and creates team member record';
COMMENT ON FUNCTION remove_team_member IS 'Soft deletes team member with validation';
COMMENT ON FUNCTION mark_expired_invitations IS 'Scheduled job to mark pending invitations as expired (run daily)';
COMMENT ON FUNCTION cleanup_removed_team_members IS 'Scheduled job to purge soft-deleted members after 90 days';
COMMENT ON FUNCTION cleanup_expired_invitations IS 'Scheduled job to purge expired invitations after 90 days';

-- ============================================================================
-- SCHEDULED JOBS (pg_cron examples - configure via application or pg_cron)
-- ============================================================================

-- Example pg_cron schedule (if using pg_cron extension):
--
-- -- Run every hour to mark expired invitations
-- SELECT cron.schedule(
--   'mark-expired-invitations',
--   '0 * * * *',  -- Every hour
--   $$SELECT mark_expired_invitations();$$
-- );
--
-- -- Run daily at 2 AM to cleanup old data
-- SELECT cron.schedule(
--   'cleanup-old-team-data',
--   '0 2 * * *',  -- Daily at 2 AM
--   $$
--     SELECT cleanup_removed_team_members();
--     SELECT cleanup_expired_invitations();
--   $$
-- );

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Get all active team members for a project
-- SELECT * FROM get_active_team_members('proj_xyz123');

-- Get all pending invitations for a project
-- SELECT * FROM get_pending_invitations('proj_xyz123');

-- Check if user can remove a team member
-- SELECT can_remove_team_member(
--   'user_michael789'::UUID,  -- User to remove
--   'proj_xyz123'::UUID,      -- Project
--   'user_sarah456'::UUID     -- User requesting removal
-- );

-- Accept an invitation
-- SELECT accept_invitation('a7f3c9d2...', 'user_michael789'::UUID);

-- Remove a team member (soft delete)
-- SELECT remove_team_member(
--   'user_michael789'::UUID,  -- User to remove
--   'proj_xyz123'::UUID,      -- Project
--   'user_sarah456'::UUID     -- User performing removal
-- );

-- Mark expired invitations (run via cron)
-- SELECT mark_expired_invitations();

-- Cleanup old data (run via cron)
-- SELECT cleanup_removed_team_members();
-- SELECT cleanup_expired_invitations();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
