-- Migration: Add terms acceptance columns to projects table
-- Run this against your Neon database

-- Add terms acceptance columns if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS terms_accepted_by UUID REFERENCES users(id);

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS terms_ip_address VARCHAR(50);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects' 
  AND column_name IN ('terms_accepted_at', 'terms_accepted_by', 'terms_ip_address');
