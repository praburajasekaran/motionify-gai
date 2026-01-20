-- Comment Attachments Table Migration
-- Purpose: Store file attachment metadata for comments using R2 presigned URLs

DROP TABLE IF EXISTS comment_attachments CASCADE;

CREATE TABLE IF NOT EXISTS comment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES proposal_comments(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  r2_key VARCHAR(512) NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on comment_id for efficient queries when loading attachments for a comment
CREATE INDEX IF NOT EXISTS idx_comment_attachments_comment_id ON comment_attachments(comment_id);

-- Index on uploaded_by for user lookups (e.g., "what files did this user upload?")
CREATE INDEX IF NOT EXISTS idx_comment_attachments_uploaded_by ON comment_attachments(uploaded_by);

-- Index on created_at for sorting attachments by upload time
CREATE INDEX IF NOT EXISTS idx_comment_attachments_created_at ON comment_attachments(created_at ASC);
