-- Migration 007: Add missing task_stage enum values
-- The backend state machine uses awaiting_approval and revision_requested
-- but these were missing from the database enum

-- Add awaiting_approval (used instead of 'review' in the state machine)
ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'awaiting_approval';

-- Add revision_requested (used in the revision workflow)
ALTER TYPE task_stage ADD VALUE IF NOT EXISTS 'revision_requested';

-- Note: Cannot remove or rename enum values in PostgreSQL without recreating the type
-- The 'review' value remains for backward compatibility but is not used by the backend
