CREATE TABLE IF NOT EXISTS pending_inquiry_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_inquiry_verifications_token ON pending_inquiry_verifications(token);
CREATE INDEX IF NOT EXISTS idx_pending_inquiry_verifications_email ON pending_inquiry_verifications(email);
