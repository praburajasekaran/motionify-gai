-- Migration 018: Add project settings fields
-- Adds description, website, start_date, due_date columns to projects table
-- Converts status from enum to VARCHAR if needed, then applies expanded CHECK constraint

-- 1. Add new columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date DATE;

-- 2. Convert status column from enum to VARCHAR if it's currently an enum type
DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'projects' AND column_name = 'status';

  IF col_type = 'USER-DEFINED' THEN
    -- It's an enum type, convert to VARCHAR
    ALTER TABLE projects ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
    -- Drop the enum type if it exists
    DROP TYPE IF EXISTS project_status;
  END IF;
END $$;

-- 3. Drop existing status CHECK constraint(s) and replace with expanded one
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'projects'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE projects DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'active', 'in_review', 'awaiting_payment', 'on_hold', 'completed', 'archived', 'cancelled'));

-- 4. Backfill start_date from created_at for existing projects
UPDATE projects SET start_date = created_at::date WHERE start_date IS NULL;
