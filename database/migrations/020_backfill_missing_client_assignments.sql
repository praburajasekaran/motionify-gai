-- Backfill projects that have an inquiry with contact_email but no client_user_id.
-- This handles cases where create-from-payment succeeded but the subsequent
-- create-client call failed, leaving the project without a client.

-- Step 1: For projects missing client_user_id, look up the inquiry contact_email
-- and match to existing users
UPDATE projects p
SET client_user_id = u.id
FROM inquiries i
JOIN users u ON LOWER(u.email) = LOWER(i.contact_email)
WHERE p.inquiry_id = i.id
  AND p.client_user_id IS NULL
  AND i.contact_email IS NOT NULL;

-- Step 2: Add missing client entries to project_team for any project
-- that now has a client_user_id but no corresponding project_team entry
INSERT INTO project_team (user_id, project_id, role, is_primary_contact, added_at)
SELECT p.client_user_id, p.id, 'client', true, NOW()
FROM projects p
WHERE p.client_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_team pt
    WHERE pt.user_id = p.client_user_id
      AND pt.project_id = p.id
  );
