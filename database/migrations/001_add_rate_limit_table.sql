-- Migration: add_rate_limit_table
-- Created: 2025-01-19
-- Description: Add rate_limit_entries table for API rate limiting

-- UP
CREATE TABLE IF NOT EXISTS rate_limit_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
ON rate_limit_entries (identifier, action, created_at);

-- DOWN
DROP INDEX IF EXISTS idx_rate_limit_lookup;
DROP TABLE IF EXISTS rate_limit_entries;
