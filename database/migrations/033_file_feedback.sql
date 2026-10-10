-- UP
CREATE UNIQUE INDEX IF NOT EXISTS deliverable_files_identity ON deliverable_files (id, deliverable_id);

INSERT INTO deliverable_files (deliverable_id, file_key, file_name, file_category, is_final, label)
SELECT d.id, legacy.file_key, regexp_replace(legacy.file_key, '^.*/', ''),
  CASE WHEN lower(legacy.file_key) ~ '\.(mp4|mov|avi|mkv|webm|wmv|flv|m4v)$' THEN 'video'
       WHEN lower(legacy.file_key) ~ '\.(jpg|jpeg|png|gif|webp|svg|bmp)$' THEN 'image'
       ELSE 'asset' END,
  legacy.is_final, CASE WHEN legacy.is_final THEN 'Legacy final upload' ELSE 'Legacy beta upload' END
FROM deliverables d
CROSS JOIN LATERAL (VALUES (d.beta_file_key, false), (d.final_file_key, true)) AS legacy(file_key, is_final)
WHERE legacy.file_key IS NOT NULL AND legacy.file_key <> ''
  AND NOT EXISTS (SELECT 1 FROM deliverable_files f WHERE f.deliverable_id = d.id AND f.file_key = legacy.file_key);

CREATE TABLE IF NOT EXISTS deliverable_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  file_id UUID NOT NULL,
  parent_id UUID,
  author_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  video_timestamp DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, file_id, deliverable_id),
  FOREIGN KEY (file_id, deliverable_id) REFERENCES deliverable_files(id, deliverable_id),
  FOREIGN KEY (parent_id, file_id, deliverable_id) REFERENCES deliverable_feedback(id, file_id, deliverable_id),
  CHECK ((parent_id IS NULL AND video_timestamp IS NOT NULL AND video_timestamp >= 0 AND video_timestamp < 'Infinity'::float8)
    OR (parent_id IS NOT NULL AND video_timestamp IS NULL))
);
CREATE INDEX IF NOT EXISTS deliverable_feedback_file_created ON deliverable_feedback (file_id, created_at, id);

ALTER TABLE revision_requests ADD COLUMN IF NOT EXISTS reviewed_file_id UUID;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'revision_reviewed_file_identity') THEN
    ALTER TABLE revision_requests ADD CONSTRAINT revision_reviewed_file_identity
      FOREIGN KEY (reviewed_file_id, deliverable_id) REFERENCES deliverable_files(id, deliverable_id);
  END IF;
END $$;
