-- UP
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  remember_me BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email ON magic_link_tokens (email);

UPDATE magic_link_tokens
SET remember_me = COALESCE(remember_me, false), created_at = COALESCE(created_at, NOW())
WHERE remember_me IS NULL OR created_at IS NULL;
ALTER TABLE magic_link_tokens
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN token TYPE VARCHAR(255),
  ALTER COLUMN remember_me SET DEFAULT false,
  ALTER COLUMN remember_me SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN created_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS pending_inquiry_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

UPDATE pending_inquiry_verifications SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE pending_inquiry_verifications
  ALTER COLUMN created_at SET DEFAULT NOW(), ALTER COLUMN created_at SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pending_inquiry_verifications'::regclass
      AND conname = 'pending_inquiry_verifications_token_key') THEN
    ALTER TABLE pending_inquiry_verifications ADD CONSTRAINT pending_inquiry_verifications_token_key UNIQUE (token);
  END IF;
END $$;

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS client_user_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
