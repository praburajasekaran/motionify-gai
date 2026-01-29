-- ============================================================================
-- Migration: Create Project Team Tables
-- ============================================================================
-- Creates project_team and project_invitations tables for managing
-- team membership per project and token-based email invitations.
--
-- Created: 2026-01-29
-- Phase: team-management
-- ============================================================================

-- UP

-- Drop partially-created tables from failed migration attempt
DROP TABLE IF EXISTS project_invitations;
DROP TABLE IF EXISTS project_team;

-- ============================================================================
-- 1. PROJECT_TEAM TABLE
-- ============================================================================
-- Tracks which users are members of which projects.
-- Supports soft delete via removed_at for historical data retention.

CREATE TABLE project_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client')),
  is_primary_contact BOOLEAN DEFAULT FALSE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  invitation_id UUID,
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

-- Indexes for project_team
CREATE INDEX IF NOT EXISTS idx_project_team_project ON project_team(project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_user ON project_team(user_id);
CREATE INDEX IF NOT EXISTS idx_project_team_active ON project_team(project_id) WHERE removed_at IS NULL;

COMMENT ON TABLE project_team IS 'Project team membership - tracks which users belong to which projects';
COMMENT ON COLUMN project_team.is_primary_contact IS 'True for the client who is the primary contact (approval rights)';
COMMENT ON COLUMN project_team.removed_at IS 'Soft delete timestamp - NULL means active member';

-- ============================================================================
-- 2. PROJECT_INVITATIONS TABLE
-- ============================================================================
-- Token-based email invitations for adding users to projects.
-- Separate from user_invitations (which handles global user account creation).

CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  resent_at TIMESTAMPTZ,
  resent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for project_invitations
CREATE INDEX IF NOT EXISTS idx_project_invitations_project ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);
CREATE INDEX IF NOT EXISTS idx_project_invitations_pending ON project_invitations(project_id) WHERE status = 'pending';

COMMENT ON TABLE project_invitations IS 'Token-based email invitations for project team membership';
COMMENT ON COLUMN project_invitations.token IS '64-char hex token sent in invitation email';
COMMENT ON COLUMN project_invitations.expires_at IS 'Invitation expires 7 days after creation';

-- ============================================================================
-- 3. BACKFILL: Add existing clients as primary contacts
-- ============================================================================
-- For every project that has a client_user_id, add that user as a primary
-- contact in the project_team table.

INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_at)
SELECT p.client_user_id, p.id, 'client', true, p.created_at
FROM projects p
WHERE p.client_user_id IS NOT NULL
ON CONFLICT (user_id, project_id) DO NOTHING;

-- DOWN

-- DROP TABLE IF EXISTS project_invitations;
-- DROP TABLE IF EXISTS project_team;
