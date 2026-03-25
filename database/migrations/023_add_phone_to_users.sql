-- Migration 022: Add phone column to users table
-- Phone was previously only stored on the inquiries table (contact_phone).
-- Adding it to users so client contact info is accessible from project settings.

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Backfill phone from inquiry data where the user's email matches the inquiry contact_email
UPDATE users u
SET phone = i.contact_phone
FROM inquiries i
WHERE i.contact_email = u.email
  AND u.phone IS NULL
  AND i.contact_phone IS NOT NULL
  AND i.contact_phone != '';
