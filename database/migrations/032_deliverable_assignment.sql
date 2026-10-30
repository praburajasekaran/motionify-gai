-- UP
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
