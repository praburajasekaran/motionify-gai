-- File Expiry Tracking Migration
-- Adds columns to track when final deliverables were delivered and if they've expired
-- Created: 2026-01-12

-- Add final_delivered_at to track when the final delivery occurred
ALTER TABLE deliverables 
ADD COLUMN IF NOT EXISTS final_delivered_at TIMESTAMPTZ;

-- Add files_expired to mark deliverables with expired download links
ALTER TABLE deliverables 
ADD COLUMN IF NOT EXISTS files_expired BOOLEAN DEFAULT false;

-- Add last_reminder_sent to payments table to track reminder emails
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;

-- Add index for efficient querying of expirable deliverables
CREATE INDEX IF NOT EXISTS idx_deliverables_final_delivered_at 
ON deliverables(final_delivered_at) 
WHERE status = 'final_delivered';

-- Backfill existing final_delivered deliverables with their updated_at timestamp
UPDATE deliverables 
SET final_delivered_at = updated_at 
WHERE status = 'final_delivered' 
AND final_delivered_at IS NULL;

-- Display result
SELECT 'Migration complete: Added file expiry tracking columns' as result;
