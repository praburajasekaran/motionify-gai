-- Migration: Add revisions_included to proposals table
-- This allows admins to specify the number of revisions included in a proposal,
-- which flows through to the project when created after payment.

ALTER TABLE proposals
  ADD COLUMN revisions_included INTEGER NOT NULL DEFAULT 2;
