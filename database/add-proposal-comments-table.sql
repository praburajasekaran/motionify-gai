-- Proposal Comments Table Migration
-- Purpose: Add comments table for proposal discussions between admins and clients

DROP TABLE IF EXISTS proposal_comments CASCADE;

CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id ON proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_user_id ON proposal_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_created_at ON proposal_comments(created_at ASC);
