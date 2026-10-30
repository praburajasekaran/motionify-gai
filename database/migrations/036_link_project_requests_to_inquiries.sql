-- UP
ALTER TABLE project_requests
  ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES inquiries(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_requests_inquiry_id
  ON project_requests (inquiry_id)
  WHERE inquiry_id IS NOT NULL;
