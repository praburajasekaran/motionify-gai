-- Add client_user_id column to inquiries table
-- This links inquiries to user accounts created from the contact email

ALTER TABLE inquiries 
ADD COLUMN IF NOT EXISTS client_user_id UUID REFERENCES users(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inquiries_client_user_id ON inquiries(client_user_id);

-- Backfill existing inquiries by matching contact_email to users.email
UPDATE inquiries 
SET client_user_id = users.id
FROM users
WHERE inquiries.contact_email = users.email
  AND inquiries.client_user_id IS NULL;

-- Add comment
COMMENT ON COLUMN inquiries.client_user_id IS 'Links inquiry to the client user account (populated when user is created from contact email)';
