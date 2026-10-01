-- Migration 028: Reconcile runtime database contracts
--
-- This migration is deliberately forward-compatible with the known production
-- drift. It creates missing objects and alters existing objects in place; it
-- never drops or recreates an application table.

-- UP

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------------------------------------------------------
-- Client project requests
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(50) NOT NULL UNIQUE,
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  tentative_deadline DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_requests_status_check
    CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'converted', 'cancelled'))
);

ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS request_number VARCHAR(50);
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS client_user_id UUID;
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS tentative_deadline DATE;
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE project_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'project_requests'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE project_requests DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;

UPDATE project_requests SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE project_requests SET status = 'pending' WHERE status IS NULL OR status = 'new';
UPDATE project_requests SET status = 'reviewing' WHERE status IN ('review', 'in_review');
UPDATE project_requests SET status = 'approved' WHERE status = 'accepted';
UPDATE project_requests SET status = 'rejected' WHERE status = 'declined';
UPDATE project_requests SET status = 'converted' WHERE status = 'project_created';
UPDATE project_requests SET created_at = NOW() WHERE created_at IS NULL;
UPDATE project_requests SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;

DO $$
DECLARE
  incomplete_rows BIGINT;
BEGIN
  SELECT COUNT(*)
  INTO incomplete_rows
  FROM project_requests
  WHERE request_number IS NULL
     OR client_user_id IS NULL
     OR title IS NULL
     OR description IS NULL
     OR tentative_deadline IS NULL;

  IF incomplete_rows > 0 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23502',
      MESSAGE = format(
        'Cannot reconcile project_requests: %s legacy row(s) are missing required request data',
        incomplete_rows
      ),
      HINT = 'Backfill request_number, client_user_id, title, description, and tentative_deadline before retrying migration 028.';
  END IF;
END $$;

ALTER TABLE project_requests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE project_requests ALTER COLUMN id SET NOT NULL;
ALTER TABLE project_requests ALTER COLUMN request_number SET NOT NULL;
ALTER TABLE project_requests ALTER COLUMN client_user_id SET NOT NULL;
ALTER TABLE project_requests ALTER COLUMN title SET NOT NULL;
ALTER TABLE project_requests ALTER COLUMN description SET NOT NULL;
ALTER TABLE project_requests ALTER COLUMN tentative_deadline SET NOT NULL;
ALTER TABLE project_requests ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE project_requests ALTER COLUMN status SET NOT NULL;
ALTER TABLE project_requests ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE project_requests ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE project_requests ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE project_requests ALTER COLUMN updated_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'project_requests'
      AND con.contype = 'p'
      AND pg_get_constraintdef(con.oid) = 'PRIMARY KEY (id)'
  ) THEN
    ALTER TABLE project_requests ADD CONSTRAINT project_requests_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'project_requests'
      AND con.contype = 'u'
      AND pg_get_constraintdef(con.oid) = 'UNIQUE (request_number)'
  ) THEN
    ALTER TABLE project_requests
      ADD CONSTRAINT project_requests_request_number_key UNIQUE (request_number);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'project_requests'
      AND con.contype = 'f'
      AND pg_get_constraintdef(con.oid) LIKE 'FOREIGN KEY (client_user_id) REFERENCES users(id)%'
  ) THEN
    ALTER TABLE project_requests
      ADD CONSTRAINT project_requests_client_user_id_fkey
      FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE project_requests
  ADD CONSTRAINT project_requests_status_check
  CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'converted', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_project_requests_client ON project_requests(client_user_id);
CREATE INDEX IF NOT EXISTS idx_project_requests_status ON project_requests(status);
CREATE INDEX IF NOT EXISTS idx_project_requests_created_at ON project_requests(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_project_requests_updated_at'
      AND tgrelid = 'project_requests'::regclass
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER update_project_requests_updated_at
      BEFORE UPDATE ON project_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- --------------------------------------------------------------------------
-- Deliverables and canonical project status
-- --------------------------------------------------------------------------

ALTER TABLE deliverables ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE projects ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE projects ALTER COLUMN status DROP DEFAULT;

DO $$
DECLARE
  current_data_type TEXT;
BEGIN
  SELECT data_type INTO current_data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'projects'
    AND column_name = 'status';

  IF current_data_type = 'USER-DEFINED' THEN
    ALTER TABLE projects
      ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
  END IF;
END $$;

DO $$
DECLARE
  constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'projects'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE projects DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;

UPDATE projects SET status = 'active' WHERE status IS NULL OR status IN ('in_progress', 'started');
UPDATE projects SET status = 'in_review' WHERE status = 'review';
UPDATE projects SET status = 'draft' WHERE status = 'pending';

DO $$
DECLARE
  invalid_statuses TEXT;
BEGIN
  SELECT string_agg(DISTINCT status, ', ' ORDER BY status)
  INTO invalid_statuses
  FROM projects
  WHERE status NOT IN (
    'draft', 'active', 'in_review', 'awaiting_payment',
    'on_hold', 'completed', 'archived', 'cancelled'
  );

  IF invalid_statuses IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot reconcile projects.status; unsupported values: %', invalid_statuses;
  END IF;
END $$;

ALTER TABLE projects ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
ALTER TABLE projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'active', 'in_review', 'awaiting_payment', 'on_hold', 'completed', 'archived', 'cancelled'));

-- --------------------------------------------------------------------------
-- Project team and invitation columns consumed by invitation acceptance
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'support', 'team_member', 'client')),
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  invitation_id UUID,
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE project_team ADD COLUMN IF NOT EXISTS invitation_id UUID;
ALTER TABLE project_team ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE project_team ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES users(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_team_user_project
  ON project_team(user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_team_active
  ON project_team(project_id) WHERE removed_at IS NULL;

CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(500) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'team_member')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  resent_at TIMESTAMPTZ,
  resent_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES users(id);
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id);
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS resent_at TIMESTAMPTZ;
ALTER TABLE project_invitations ADD COLUMN IF NOT EXISTS resent_count INTEGER DEFAULT 0;

UPDATE project_invitations SET resent_count = 0 WHERE resent_count IS NULL;
ALTER TABLE project_invitations ALTER COLUMN resent_count SET DEFAULT 0;
ALTER TABLE project_invitations ALTER COLUMN resent_count SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_invitations_project
  ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token
  ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_pending
  ON project_invitations(project_id) WHERE status = 'pending';

-- --------------------------------------------------------------------------
-- Session columns consumed by the authentication runtime
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  jwt_token_hash VARCHAR(255),
  remember_me BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS token VARCHAR(500);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS jwt_token_hash VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS remember_me BOOLEAN DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE sessions SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE sessions SET token = gen_random_uuid()::text WHERE token IS NULL;
UPDATE sessions SET remember_me = false WHERE remember_me IS NULL;
UPDATE sessions SET expires_at = NOW() WHERE expires_at IS NULL;
UPDATE sessions SET created_at = NOW() WHERE created_at IS NULL;
UPDATE sessions SET last_active_at = COALESCE(created_at, NOW()) WHERE last_active_at IS NULL;

ALTER TABLE sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE sessions ALTER COLUMN id SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN token SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN remember_me SET DEFAULT false;
ALTER TABLE sessions ALTER COLUMN remember_me SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN last_active_at SET DEFAULT NOW();
ALTER TABLE sessions ALTER COLUMN last_active_at SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE sessions ALTER COLUMN created_at SET NOT NULL;

-- Identical hashes represent the same bearer credential. Retain one row for
-- each legacy credential before enforcing one-to-one revocation semantics.
WITH duplicate_session_hashes AS (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY jwt_token_hash
        ORDER BY created_at DESC NULLS LAST, id
      ) AS duplicate_number
    FROM sessions
    WHERE jwt_token_hash IS NOT NULL
  ) ranked_sessions
  WHERE duplicate_number > 1
)
DELETE FROM sessions
WHERE id IN (SELECT id FROM duplicate_session_hashes);

DROP INDEX IF EXISTS idx_sessions_jwt_token_hash;
CREATE UNIQUE INDEX idx_sessions_jwt_token_hash
  ON sessions(jwt_token_hash)
  WHERE jwt_token_hash IS NOT NULL;

-- A physical R2 object must have a single metadata owner. Refuse ambiguous
-- legacy data rather than allowing one metadata row to delete another row's
-- object, then enforce the invariant for all future inserts.
DO $$
DECLARE
  duplicate_key TEXT;
BEGIN
  IF to_regclass('public.project_files') IS NOT NULL THEN
    SELECT r2_key
    INTO duplicate_key
    FROM project_files
    GROUP BY r2_key
    HAVING COUNT(*) > 1
    LIMIT 1;

    IF duplicate_key IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = 'Cannot reconcile project_files: duplicate R2 object keys exist',
        HINT = 'Resolve duplicate project_files.r2_key rows before retrying migration 028.';
    END IF;

    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_project_files_r2_key ON project_files(r2_key)';
  END IF;
END $$;

-- This forward-compatible reconciliation is intentionally irreversible. An
-- application rollback must leave these additive schema contracts in place.
