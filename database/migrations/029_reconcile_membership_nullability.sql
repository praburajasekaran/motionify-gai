-- Migration 029: Reconcile membership nullability
--
-- Older production tables allowed nulls for fields that the runtime and
-- canonical schema treat as required. Backfill existing rows before enforcing
-- the defaults and NOT NULL constraints.

-- UP

UPDATE project_team
SET is_primary_contact = false
WHERE is_primary_contact IS NULL;

UPDATE project_team
SET added_at = COALESCE(created_at, NOW())
WHERE added_at IS NULL;

ALTER TABLE project_team
  ALTER COLUMN is_primary_contact SET DEFAULT false,
  ALTER COLUMN is_primary_contact SET NOT NULL,
  ALTER COLUMN added_at SET DEFAULT NOW(),
  ALTER COLUMN added_at SET NOT NULL;

UPDATE project_invitations
SET status = 'pending'
WHERE status IS NULL;

ALTER TABLE project_invitations
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL;

-- This forward-compatible reconciliation is intentionally irreversible.
