-- Migration 006: Add user_name column to task_comments
-- The API expects user_name for denormalized display (avoids JOINs on reads)

-- Add user_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'task_comments' AND column_name = 'user_name'
    ) THEN
        ALTER TABLE task_comments ADD COLUMN user_name VARCHAR(255);

        -- Backfill existing comments with user names from users table
        UPDATE task_comments tc
        SET user_name = u.full_name
        FROM users u
        WHERE tc.user_id = u.id AND tc.user_name IS NULL;

        -- Set NOT NULL constraint after backfill
        -- (commented out in case there are orphaned comments)
        -- ALTER TABLE task_comments ALTER COLUMN user_name SET NOT NULL;
    END IF;
END $$;
