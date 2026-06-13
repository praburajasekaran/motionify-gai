-- Migration 028: Link project tasks to deliverables
-- Purpose: Treat proposal deliverables as the v1 milestone unit by allowing
-- support tasks to be sequenced under a deliverable.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS deliverable_id UUID REFERENCES deliverables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_deliverable_id ON tasks(deliverable_id);
