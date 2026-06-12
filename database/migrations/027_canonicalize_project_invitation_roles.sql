-- Canonicalize project invitation roles.
--
-- Legacy rows used "team" for internal project invitations while the user and
-- project_team role model uses "team_member". Normalize existing data before
-- tightening the check constraint.

UPDATE project_invitations
SET role = 'team_member'
WHERE role = 'team';

ALTER TABLE project_invitations
  DROP CONSTRAINT IF EXISTS project_invitations_role_check;

ALTER TABLE project_invitations
  ADD CONSTRAINT project_invitations_role_check
  CHECK (role IN ('client', 'team_member'));
