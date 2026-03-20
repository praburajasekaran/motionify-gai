-- Migration: Add revision request attachments and issue categories
-- Created: 2025-01-27
-- Purpose: Support persisting full revision feedback including attachments and issue categorization

-- Create attachments table for revision requests
CREATE TABLE IF NOT EXISTS revision_request_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_request_id UUID NOT NULL REFERENCES revision_requests(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    r2_key TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revision_request_attachments_request_id
    ON revision_request_attachments(revision_request_id);

-- Add issue_categories to revision_requests
ALTER TABLE revision_requests
ADD COLUMN IF NOT EXISTS issue_categories TEXT[];
