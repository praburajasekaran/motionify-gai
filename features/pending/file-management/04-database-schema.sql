-- ============================================================================
-- File Management - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: November 15, 2025
--
-- This schema defines the tables needed for file upload, download, and
-- organization features (US-015, US-016, US-017).
-- Files are stored in Cloudflare R2, with metadata tracked in PostgreSQL.
-- ============================================================================

-- ============================================================================
-- FILES TABLE
-- ============================================================================
-- NOTE: The files table is defined in the core-foundation schema
-- See: features/core-foundation/04-database-schema.sql
--
-- The files table is a foundational table referenced by multiple features:
-- - feedback-and-revisions (file_comments)
-- - deliverable-approval (beta_file_id, final_file_id)
-- - file-management (this schema - for download tracking and access control)
--
-- Core columns: id, created_at, updated_at, file_name, file_size, mime_type,
-- description, storage_key, storage_url, project_id, deliverable_id, uploaded_by,
-- file_type, is_watermarked, expires_at, is_deleted, download_count,
-- last_downloaded_at, last_downloaded_by
--
-- Triggers and functions for file expiry are defined in core-foundation schema.

-- ============================================================================
-- FILE_DOWNLOADS TABLE (OPTIONAL)
-- ============================================================================
-- Audit trail of file downloads
-- Optional - for detailed tracking beyond just download count

CREATE TABLE IF NOT EXISTS file_downloads (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Relationships
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  downloaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Context
  ip_address INET,  -- User's IP address
  user_agent TEXT,  -- Browser user agent
  download_duration_ms INT,  -- How long download took

  -- Metadata
  file_name VARCHAR(255) NOT NULL,  -- Cached for history
  file_size BIGINT NOT NULL  -- Cached for history
);

-- Indexes
CREATE INDEX idx_file_downloads_file_id ON file_downloads(file_id);
CREATE INDEX idx_file_downloads_downloaded_by ON file_downloads(downloaded_by);
CREATE INDEX idx_file_downloads_created_at ON file_downloads(created_at DESC);

-- ============================================================================
-- FILE_COMMENTS TABLE (US-019)
-- ============================================================================
-- NOTE: The file_comments table is defined in the feedback-and-revisions schema
-- See: features/feedback-and-revisions/04-database-schema.sql
--
-- The canonical definition includes comprehensive features:
-- - Author name and role caching
-- - Reply count tracking
-- - Raw text storage
-- - Project ID for cross-referencing
-- - Timestamp support for video/audio comments
-- - Threading support (parent_comment_id)
--
-- Canonical columns: id, file_id, project_id, created_at, updated_at,
-- text, raw_text, parent_comment_id, timestamp, timestamp_seconds,
-- author_id, author_name, author_role, is_edited, edited_at,
-- is_deleted, deleted_at, deleted_by, mentioned_user_ids, reply_count

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user can access a file
CREATE OR REPLACE FUNCTION can_access_file(
  p_file_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_project_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_is_deleted BOOLEAN;
  v_has_access BOOLEAN;
BEGIN
  -- Get file details
  SELECT project_id, expires_at, is_deleted
  INTO v_project_id, v_expires_at, v_is_deleted
  FROM files
  WHERE id = p_file_id;

  -- File not found
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- File is deleted
  IF v_is_deleted THEN
    RETURN false;
  END IF;

  -- File has expired
  IF v_expires_at IS NOT NULL AND v_expires_at < CURRENT_TIMESTAMP THEN
    RETURN false;
  END IF;

  -- Check if user is on project team
  SELECT EXISTS (
    SELECT 1 FROM project_team
    WHERE project_id = v_project_id
    AND user_id = p_user_id
    AND removed_at IS NULL
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql;

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_file_download_count(
  p_file_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE files
  SET
    download_count = COALESCE(download_count, 0) + 1,
    last_downloaded_at = CURRENT_TIMESTAMP,
    last_downloaded_by = p_user_id
  WHERE id = p_file_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get files by deliverable with details
CREATE OR REPLACE FUNCTION get_files_by_deliverable(
  p_project_id UUID,
  p_deliverable_id UUID DEFAULT NULL
) RETURNS TABLE (
  file_id UUID,
  file_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  description TEXT,
  deliverable_id UUID,
  deliverable_name VARCHAR(255),
  uploaded_by_id UUID,
  uploaded_by_name VARCHAR(255),
  uploaded_at TIMESTAMP WITH TIME ZONE,
  download_count INT,
  comment_count BIGINT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_accessible BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.file_name,
    f.file_size,
    f.mime_type,
    f.description,
    f.deliverable_id,
    d.name,
    f.uploaded_by,
    u.name,
    f.created_at,
    f.download_count,
    (SELECT COUNT(*) FROM file_comments fc WHERE fc.file_id = f.id AND fc.is_deleted = false),
    f.expires_at,
    CASE
      WHEN f.expires_at IS NOT NULL AND f.expires_at < CURRENT_TIMESTAMP THEN false
      ELSE true
    END
  FROM files f
  JOIN deliverables d ON f.deliverable_id = d.id
  LEFT JOIN users u ON f.uploaded_by = u.id
  WHERE f.project_id = p_project_id
    AND f.is_deleted = false
    AND (p_deliverable_id IS NULL OR f.deliverable_id = p_deliverable_id)
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ACTIVITY LOG INTEGRATION
-- ============================================================================
-- New activity types for file management
-- (Assumes activities table exists with type column)

COMMENT ON TABLE files IS 'File metadata for project deliverables stored in Cloudflare R2';
COMMENT ON TABLE file_downloads IS 'Audit trail of file download events';
COMMENT ON TABLE file_comments IS 'Comments and discussions on files (US-019)';

-- Activity types to be logged:
-- - FILE_UPLOADED: User uploads new file
-- - FILE_DOWNLOADED: User downloads file
-- - FILE_MOVED: File moved to different deliverable
-- - FILE_DELETED: File soft-deleted
-- - FILE_COMMENT_ADDED: Comment added to file (US-019)
-- - FILE_EXPIRED: File access expired (automated)
-- - FILE_ACCESS_EXTENDED: Admin extended file access

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Commented out - uncomment for development

/*
-- Sample file upload
INSERT INTO files (
  id,
  file_name,
  file_size,
  mime_type,
  description,
  storage_key,
  storage_url,
  project_id,
  deliverable_id,
  uploaded_by,
  file_type,
  is_watermarked
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Rough-Cut-v2.mp4',
  149456896,  -- ~142.5 MB
  'video/mp4',
  'Latest rough cut with music and voiceover',
  'projects/550e8400-e29b-41d4-a716-446655440000/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4',
  'https://motionify-files.r2.cloudflarestorage.com/projects/550e8400-e29b-41d4-a716-446655440000/files/a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp4',
  (SELECT id FROM projects LIMIT 1),
  (SELECT id FROM deliverables WHERE name = 'Rough Cut' LIMIT 1),
  (SELECT id FROM users WHERE email = 'mike@motionify.com' LIMIT 1),
  'beta',
  true
);

-- Sample file comment
INSERT INTO file_comments (
  file_id,
  user_id,
  comment_text
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM users WHERE email = 'sarah@motionify.com' LIMIT 1),
  'Love the new music! Much better pacing.'
);
*/

-- ============================================================================
-- CLEANUP JOBS (to be scheduled)
-- ============================================================================

-- Job to clean up orphaned files (files uploaded but never registered)
-- Run daily via cron or background worker
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS VOID AS $$
BEGIN
  -- Mark files as deleted if uploaded > 24 hours ago but never registered
  -- This handles cases where upload started but registration never completed
  UPDATE files
  SET is_deleted = true
  WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
    AND file_size = 0  -- Placeholder files created during presigned URL generation
    AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- Job to notify about expiring files (30 days before expiry)
CREATE OR REPLACE FUNCTION get_expiring_files()
RETURNS TABLE (
  file_id UUID,
  file_name VARCHAR(255),
  project_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE,
  days_until_expiry INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.file_name,
    f.project_id,
    f.expires_at,
    EXTRACT(DAY FROM (f.expires_at - CURRENT_TIMESTAMP))::INT
  FROM files f
  WHERE f.expires_at IS NOT NULL
    AND f.expires_at > CURRENT_TIMESTAMP
    AND f.expires_at < CURRENT_TIMESTAMP + INTERVAL '30 days'
    AND f.is_deleted = false
  ORDER BY f.expires_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- If files table already exists from another feature, use this to add columns:
/*
ALTER TABLE files ADD COLUMN IF NOT EXISTS deliverable_id UUID REFERENCES deliverables(id) ON DELETE RESTRICT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS file_type VARCHAR(20);
ALTER TABLE files ADD COLUMN IF NOT EXISTS is_watermarked BOOLEAN DEFAULT false;
ALTER TABLE files ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0;
ALTER TABLE files ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS last_downloaded_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_files_deliverable_id ON files(deliverable_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at) WHERE expires_at IS NOT NULL;
*/

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
