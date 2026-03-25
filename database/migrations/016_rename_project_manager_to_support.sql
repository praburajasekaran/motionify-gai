-- ============================================================================
-- Migration: Rename project_manager role to support
-- ============================================================================
-- The project_manager role is being replaced with a support role.
-- Support users are the single point of contact (SPOC) for clients.
-- They appear to clients as "Motionify Support" (no individual name).
--
-- Created: 2026-02-08
-- Phase: role-rename
-- ============================================================================

-- UP

-- ============================================================================
-- 1. UPDATE user_role ENUM TYPE (users.role uses this enum)
-- ============================================================================
-- PostgreSQL doesn't allow ALTER TYPE RENAME VALUE inside a transaction,
-- so we convert the column to varchar, drop the old enum, create a new one,
-- and convert back.

-- Step 1a: Drop CHECK constraints that reference the role column
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND con.contype = 'c'
      AND rel.relname IN ('users', 'user_invitations', 'project_team', 'project_invitations')
      AND pg_get_constraintdef(con.oid) LIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.relname, r.conname);
    RAISE NOTICE 'Dropped constraint % on table %', r.conname, r.relname;
  END LOOP;
END $$;

-- Step 1b: Drop default on users.role (references the enum type)
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;

-- Step 1c: Convert users.role from enum to varchar
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text;

-- Step 1d: Drop old enum and create new one with 'support' instead of 'project_manager'
DROP TYPE IF EXISTS user_role;
CREATE TYPE user_role AS ENUM ('super_admin', 'support', 'team_member', 'client');

-- ============================================================================
-- 2. UPDATE EXISTING DATA (while column is varchar, before converting back)
-- ============================================================================

UPDATE users SET role = 'support' WHERE role = 'project_manager';
UPDATE user_invitations SET role = 'support' WHERE role = 'project_manager';
UPDATE project_team SET role = 'support' WHERE role = 'project_manager';
UPDATE project_invitations SET role = 'support' WHERE role = 'project_manager';

-- ============================================================================
-- 3. CONVERT users.role BACK TO ENUM and restore default
-- ============================================================================

ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'client';

-- ============================================================================
-- 4. RE-ADD CHECK CONSTRAINTS with 'support' instead of 'project_manager'
-- ============================================================================

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role::text IN ('super_admin', 'support', 'team_member', 'client'));

ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_role_check
  CHECK (role IN ('super_admin', 'support', 'team_member', 'client'));

ALTER TABLE project_team ADD CONSTRAINT project_team_role_check
  CHECK (role IN ('super_admin', 'support', 'team_member', 'client'));

ALTER TABLE project_invitations ADD CONSTRAINT project_invitations_role_check
  CHECK (role IN ('client', 'team'));

-- ============================================================================
-- 5. BACKFILL: Add all active support users to all existing projects
-- ============================================================================

INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_at)
SELECT u.id, p.id, 'support', false, NOW()
FROM users u CROSS JOIN projects p
WHERE u.role = 'support'::user_role AND u.is_active = true
ON CONFLICT (user_id, project_id) DO NOTHING;

-- DOWN

-- UPDATE users SET role = 'project_manager' WHERE role = 'support';
-- UPDATE user_invitations SET role = 'project_manager' WHERE role = 'support';
-- UPDATE project_team SET role = 'project_manager' WHERE role = 'support';
-- UPDATE project_invitations SET role = 'project_manager' WHERE role = 'support';
--
-- DO $$
-- DECLARE
--   r RECORD;
-- BEGIN
--   FOR r IN
--     SELECT con.conname, rel.relname
--     FROM pg_constraint con
--     JOIN pg_class rel ON con.conrelid = rel.oid
--     JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
--     WHERE nsp.nspname = 'public'
--       AND con.contype = 'c'
--       AND rel.relname IN ('users', 'user_invitations', 'project_team', 'project_invitations')
--       AND pg_get_constraintdef(con.oid) LIKE '%role%'
--   LOOP
--     EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.relname, r.conname);
--   END LOOP;
-- END $$;
--
-- ALTER TABLE users ADD CONSTRAINT users_role_check
--   CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client'));
-- ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_role_check
--   CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client'));
-- ALTER TABLE project_team ADD CONSTRAINT project_team_role_check
--   CHECK (role IN ('super_admin', 'project_manager', 'team_member', 'client'));
-- ALTER TABLE project_invitations ADD CONSTRAINT project_invitations_role_check
--   CHECK (role IN ('client', 'team'));
