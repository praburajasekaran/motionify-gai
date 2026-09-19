CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE project_status AS ENUM (
  'draft',
  'active',
  'in_progress',
  'review',
  'awaiting_payment',
  'on_hold',
  'completed',
  'archived',
  'cancelled'
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status project_status NOT NULL DEFAULT 'active'
);

CREATE TABLE deliverables (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  r2_key TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  version VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, full_name, role)
VALUES ('drift@example.com', 'Drift Fixture', 'client');

INSERT INTO projects (status) VALUES ('in_progress'), ('review');

INSERT INTO sessions (user_id, token, expires_at)
SELECT id, 'legacy-session-token', NOW() + INTERVAL '1 day'
FROM users
WHERE email = 'drift@example.com';

INSERT INTO migrations (version, name)
VALUES ('027', 'canonicalize_project_invitation_roles');
