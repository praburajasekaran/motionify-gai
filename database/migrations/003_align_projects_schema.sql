-- Migration: Align Projects Schema
-- Created: 2026-01-26
-- Purpose: Add missing columns (client_user_id, project_number) to projects table to match application expectations

-- UP

-- 1. Add columns if they don't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_user_id UUID REFERENCES users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_number VARCHAR(50);

-- 2. Backfill client_user_id with created_by (fallback)
UPDATE projects 
SET client_user_id = created_by 
WHERE client_user_id IS NULL;

-- 3. Specific fix for GreenEnergy project (assign to Test Client User)
UPDATE projects
SET client_user_id = 'aa444444-4444-4444-4444-444444444444'
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- 4. Backfill project_number
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM projects
)
UPDATE projects p
SET project_number = 'P-' || LPAD(n.rn::text, 3, '0')
FROM numbered n
WHERE p.id = n.id AND p.project_number IS NULL;

-- 5. Add constraints
ALTER TABLE projects ADD CONSTRAINT projects_project_number_key UNIQUE (project_number);
-- Note: We might allow NULLs if we don't want to enforce it strictly yet, but schema says NOT NULL. 
-- Let's enforce it since we backfilled.
ALTER TABLE projects ALTER COLUMN project_number SET NOT NULL;


-- DOWN
ALTER TABLE projects DROP COLUMN IF EXISTS client_user_id;
ALTER TABLE projects DROP COLUMN IF EXISTS project_number;
