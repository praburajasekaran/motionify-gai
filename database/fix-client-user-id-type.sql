ALTER TABLE inquiries 
DROP CONSTRAINT IF EXISTS inquiries_client_user_id_fkey;

ALTER TABLE inquiries 
ALTER COLUMN client_user_id TYPE TEXT USING client_user_id::TEXT;

COMMENT ON COLUMN inquiries.client_user_id IS 'Links inquiry to client user account. TEXT type supports both UUID and string IDs.';
