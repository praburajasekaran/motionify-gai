-- Motionify E2E Testing - Seed Test Users
-- Created: 2026-01-13
-- Purpose: Create test users for each role for E2E testing
-- Valid roles: super_admin, project_manager, team_member, client

-- ============================================================================
-- TEST USERS FOR E2E TESTING
-- ============================================================================

-- Super Admin (highest privilege - Motionify owner/admin)
INSERT INTO users (id, email, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'superadmin@motionify.test', 'Super Admin Test', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Project Manager (Motionify PM)
INSERT INTO users (id, email, full_name, role) VALUES
  ('22222222-2222-2222-2222-222222222222', 'pm@motionify.test', 'PM Test User', 'project_manager')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Team Member (Motionify internal team)
INSERT INTO users (id, email, full_name, role) VALUES
  ('33333333-3333-3333-3333-333333333333', 'team@motionify.test', 'Team Test User', 'team_member')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Clients (external)
INSERT INTO users (id, email, full_name, role) VALUES
  ('44444444-4444-4444-4444-444444444444', 'client@motionify.test', 'Client Primary Contact', 'client'),
  ('55555555-5555-5555-5555-555555555555', 'clientteam@motionify.test', 'Client Team Member', 'client')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- ============================================================================
-- VERIFY USERS CREATED
-- ============================================================================
SELECT id, email, full_name, role 
FROM users 
WHERE email LIKE '%@motionify.test'
ORDER BY role, email;
