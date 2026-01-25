-- Proposal Comments Table Migration
-- Purpose: Add comments table for proposal discussions between admins and clients
-- NOTE: This file documents the final schema after all migrations are applied
-- Actual schema transformation is handled by migration 003

DROP TABLE IF EXISTS proposal_comments CASCADE;

CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_type VARCHAR(20) NOT NULL CHECK (author_type IN ('CLIENT', 'ADMIN')),
  content TEXT NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id ON proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_author_id ON proposal_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_created_at ON proposal_comments(created_at ASC);
