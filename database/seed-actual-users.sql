-- Motionify Role-Based Access Testing - Seed Actual Test Users
-- Created: 2026-01-18
-- Purpose: Create 5 actual test users for role-based access testing
-- Valid roles: super_admin, project_manager, team_member, client

-- ============================================================================
-- ACTUAL TEST USERS FOR ROLE-BASED ACCESS TESTING
-- ============================================================================

-- Super Admin (highest privilege - Motionify owner/admin)
INSERT INTO users (id, email, full_name, role) VALUES
  ('aa111111-1111-1111-1111-111111111111', 'ekalaivan+sa@gmail.com', 'Ekalaivan (Super Admin)', 'super_admin')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Project Manager (Motionify PM)
INSERT INTO users (id, email, full_name, role) VALUES
  ('aa222222-2222-2222-2222-222222222222', 'ekalaivan+pm@gmail.com', 'Ekalaivan (Project Manager)', 'project_manager')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Motionify Team Member (internal team)
INSERT INTO users (id, email, full_name, role) VALUES
  ('aa333333-3333-3333-3333-333333333333', 'ekalaivan+mt@gmail.com', 'Ekalaivan (Motionify Team)', 'team_member')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Client (Primary Contact)
INSERT INTO users (id, email, full_name, role) VALUES
  ('aa444444-4444-4444-4444-444444444444', 'ekalaivan+c@gmail.com', 'Ekalaivan (Client)', 'client')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- Client Team Member
INSERT INTO users (id, email, full_name, role) VALUES
  ('aa555555-5555-5555-5555-555555555555', 'ekalaivan+ct@gmail.com', 'Ekalaivan (Client Team)', 'client')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- ============================================================================
-- VERIFY USERS CREATED
-- ============================================================================
SELECT id, email, full_name, role, created_at
FROM users 
WHERE email LIKE 'ekalaivan+%@gmail.com'
ORDER BY 
  CASE role 
    WHEN 'super_admin' THEN 1
    WHEN 'project_manager' THEN 2
    WHEN 'team_member' THEN 3
    WHEN 'client' THEN 4
  END,
  email;
