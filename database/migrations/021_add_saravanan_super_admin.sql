-- Migration: Add Saravanan as Super Admin
-- Date: 2026-02-16
-- Description: Create super_admin account for Motionify owner (saravanan@motionify.co)

INSERT INTO users (email, full_name, role) VALUES
  ('saravanan@motionify.co', 'Saravanan', 'super_admin')
ON CONFLICT (email) DO NOTHING;
