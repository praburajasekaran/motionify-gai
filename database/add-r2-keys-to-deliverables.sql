-- Add R2 key columns to deliverables table
ALTER TABLE deliverables 
ADD COLUMN IF NOT EXISTS beta_file_key TEXT,
ADD COLUMN IF NOT EXISTS final_file_key TEXT;
