-- ============================================================================
-- Add client_user_id to proposals and assign to existing proposals
-- Created: 2025-12-30
-- Purpose: Add client relationship to proposals table and auto-assign contacts
-- ============================================================================

-- Step 1: Add client_user_id column to proposals table if it doesn't exist
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS client_user_id UUID REFERENCES users(id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_proposals_client ON proposals(client_user_id);

-- Step 3: Find or create Alex Client account
DO $$
DECLARE
  alex_client_id UUID;
  alex_email VARCHAR := 'alex@acmecorp.com';
BEGIN
  -- Try to find Alex Client by email
  SELECT id INTO alex_client_id 
  FROM users 
  WHERE email = alex_email;
  
  -- If Alex Client doesn't exist, create the account
  IF alex_client_id IS NULL THEN
    INSERT INTO users (email, full_name, role, is_active)
    VALUES (alex_email, 'Alex Client', 'client', true)
    RETURNING id INTO alex_client_id;
  END IF;
  
  -- Assign all existing proposals without a client to Alex Client
  UPDATE proposals 
  SET client_user_id = alex_client_id 
  WHERE client_user_id IS NULL;
END $$;

-- Step 4: Display migration results
SELECT 
  'Proposals assigned: ' || COUNT(*) as result_message
FROM proposals 
WHERE client_user_id IS NOT NULL;
