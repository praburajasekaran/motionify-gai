-- UP
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_stage' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE task_stage AS ENUM ('pending', 'in_progress', 'review', 'awaiting_approval', 'revision_requested', 'completed');
  END IF;
END $$;

ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'review';
ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'awaiting_approval';
ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'revision_requested';
ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'completed';

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL, description TEXT,
  stage task_stage NOT NULL DEFAULT 'pending',
  is_client_visible BOOLEAN NOT NULL DEFAULT false,
  assigned_to UUID REFERENCES users(id), due_date DATE, position INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), user_name VARCHAR(255), content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);

CREATE TABLE IF NOT EXISTS task_followers (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), PRIMARY KEY (task_id, user_id)
);

ALTER TABLE tasks ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN is_client_visible SET DEFAULT false;
ALTER TABLE task_comments ALTER COLUMN id SET DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_stage ON tasks(stage);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS final_delivered_at TIMESTAMPTZ;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS files_expired BOOLEAN DEFAULT false;
ALTER TABLE comment_attachments ADD COLUMN IF NOT EXISTS r2_key TEXT;
ALTER TABLE comment_attachments ALTER COLUMN r2_key TYPE TEXT;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'comment_attachments' AND column_name = 'file_key') THEN
    UPDATE comment_attachments SET r2_key = file_key WHERE r2_key IS NULL;
  END IF;
END $$;
