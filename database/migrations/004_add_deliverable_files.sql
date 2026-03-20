-- Migration: Add deliverable_files table for multi-file support
-- Created: 2026-01-26
-- Purpose: Allow multiple files per deliverable (script, video, docs, etc.)

-- ============================================================================
-- DELIVERABLE_FILES TABLE
-- ============================================================================
-- Supports multiple files per deliverable with categorization
-- Files can be either beta (for review) or final (approved delivery)

CREATE TABLE IF NOT EXISTS deliverable_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,

  -- File storage
  file_key TEXT NOT NULL,              -- R2 storage key
  file_name VARCHAR(255) NOT NULL,     -- Original filename for display
  file_size BIGINT,                    -- Size in bytes
  mime_type VARCHAR(100),              -- e.g., 'video/mp4', 'application/pdf'

  -- Categorization
  file_category VARCHAR(50) DEFAULT 'asset',  -- 'video', 'script', 'document', 'image', 'asset'
  is_final BOOLEAN DEFAULT FALSE,      -- false = beta version, true = final delivery

  -- Metadata
  label VARCHAR(255),                  -- Optional user-provided label (e.g., "Main Video", "Script v2")
  sort_order INTEGER DEFAULT 0,        -- For ordering files in UI

  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),

  -- Indexes for common queries
  CONSTRAINT valid_category CHECK (file_category IN ('video', 'script', 'document', 'image', 'audio', 'asset'))
);

-- Index for fetching files by deliverable
CREATE INDEX IF NOT EXISTS idx_deliverable_files_deliverable_id ON deliverable_files(deliverable_id);

-- Index for fetching only beta or final files
CREATE INDEX IF NOT EXISTS idx_deliverable_files_is_final ON deliverable_files(deliverable_id, is_final);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- The existing beta_file_key and final_file_key columns on deliverables table
-- are kept for backward compatibility. New code should use deliverable_files.
--
-- To migrate existing data (run once after migration):
-- INSERT INTO deliverable_files (deliverable_id, file_key, file_name, file_category, is_final)
-- SELECT id, beta_file_key, 'Beta File', 'video', false
-- FROM deliverables WHERE beta_file_key IS NOT NULL;
--
-- INSERT INTO deliverable_files (deliverable_id, file_key, file_name, file_category, is_final)
-- SELECT id, final_file_key, 'Final File', 'video', true
-- FROM deliverables WHERE final_file_key IS NOT NULL;
