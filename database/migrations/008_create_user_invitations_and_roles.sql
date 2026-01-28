-- Migration: Create user_invitations table and update role constraints
-- Created: 2026-01-28
-- Purpose:
--   1. Create user_invitations table for admin-level user invitations
--      (different from project_invitations which is for project team invitations)
--   2. Update users table role constraint from 2-role system (admin, client)
--      to 4-role system (super_admin, project_manager, team_member, client)
--   3. Migrate existing 'admin' users to 'super_admin'

-- UP

BEGIN;

-- ============================================================================
-- 1. CREATE USER_INVITATIONS TABLE
-- ============================================================================
-- This table is used by invitations-create.ts and invitations-revoke.ts
-- for admin-level user creation flow

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client')),
  full_name VARCHAR(255),
  token VARCHAR(500) UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_invitations
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON user_invitations(expires_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON user_invitations;
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. MIGRATE EXISTING ADMIN USERS TO SUPER_ADMIN
-- ============================================================================
-- Must happen before changing the constraint, as the new constraint
-- won't allow 'admin' role

UPDATE users SET role = 'super_admin' WHERE role = 'admin';

-- ============================================================================
-- 3. UPDATE USERS TABLE ROLE CONSTRAINT
-- ============================================================================
-- Change from ('admin', 'client') to ('super_admin', 'project_manager', 'team_member', 'client')

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client'));

COMMIT;

-- ============================================================================
-- DOWN (rollback)
-- ============================================================================
-- To rollback this migration:
--
-- BEGIN;
--
-- -- Revert role constraint
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'client'));
--
-- -- Migrate super_admin back to admin
-- UPDATE users SET role = 'admin' WHERE role = 'super_admin';
--
-- -- Drop user_invitations table
-- DROP TABLE IF EXISTS user_invitations;
--
-- COMMIT;
