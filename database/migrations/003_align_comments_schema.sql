-- Migration: align_comments_schema
-- Created: 2026-01-25
-- Description: Align proposal_comments schema with backend expectations
-- Source: PostgreSQL official docs + project migration pattern

-- UP
BEGIN;

-- Step 1: Rename user_id to author_id (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE proposal_comments RENAME COLUMN user_id TO author_id;
    RAISE NOTICE 'Renamed user_id to author_id';
  ELSE
    RAISE NOTICE 'Column user_id does not exist, skipping rename';
  END IF;
END $$;

-- Step 2: Add author_type column with backfill logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'author_type'
  ) THEN
    -- Add column as nullable first (fast, no rewrite)
    ALTER TABLE proposal_comments
      ADD COLUMN author_type VARCHAR(20);

    -- Backfill based on users table
    UPDATE proposal_comments pc
    SET author_type = CASE
      WHEN u.role = 'client' THEN 'CLIENT'
      ELSE 'ADMIN'
    END
    FROM users u
    WHERE pc.author_id = u.id;

    -- Make it NOT NULL
    ALTER TABLE proposal_comments
      ALTER COLUMN author_type SET NOT NULL;

    -- Add constraint
    ALTER TABLE proposal_comments
      ADD CONSTRAINT check_author_type
      CHECK (author_type IN ('CLIENT', 'ADMIN'));

    RAISE NOTICE 'Added author_type column with backfill';
  ELSE
    RAISE NOTICE 'Column author_type already exists, skipping';
  END IF;
END $$;

COMMIT;

-- DOWN
BEGIN;

-- Reverse Step 2: Drop author_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'author_type'
  ) THEN
    ALTER TABLE proposal_comments
      DROP CONSTRAINT IF EXISTS check_author_type;

    ALTER TABLE proposal_comments
      DROP COLUMN author_type;

    RAISE NOTICE 'Dropped author_type column';
  END IF;
END $$;

-- Reverse Step 1: Rename back to user_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'proposal_comments'
      AND column_name = 'author_id'
  ) THEN
    ALTER TABLE proposal_comments RENAME COLUMN author_id TO user_id;
    RAISE NOTICE 'Renamed author_id back to user_id';
  END IF;
END $$;

COMMIT;
