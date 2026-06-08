-- Backfill project links for proposal activities created before project handoff.
-- Project Activity fetches by activities.project_id, while proposal activities
-- are created before a project exists and only have proposal_id at that point.

UPDATE activities a
SET project_id = p.id
FROM projects p
WHERE a.proposal_id = p.proposal_id
  AND a.project_id IS NULL;
