CREATE TABLE IF NOT EXISTS proposal_review_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'proposal_review',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_proposal_review_tokens_proposal_id
  ON proposal_review_tokens(proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_review_tokens_active
  ON proposal_review_tokens(proposal_id, expires_at)
  WHERE status = 'active';
