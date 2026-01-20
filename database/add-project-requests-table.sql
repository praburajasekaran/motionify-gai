-- Migration: add-project-requests-table.sql
-- Description: Create table for client-initiated project requests
-- These are simplified requests that go to super admin for proposal creation

-- Create the project_requests table
CREATE TABLE IF NOT EXISTS project_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number TEXT UNIQUE NOT NULL,
  client_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tentative_deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status values: pending, reviewing, proposal_sent, converted, rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_to_admin_id UUID REFERENCES users(id),
  converted_to_project_id UUID REFERENCES projects(id),
  admin_notes TEXT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_project_requests_client ON project_requests(client_user_id);
CREATE INDEX IF NOT EXISTS idx_project_requests_status ON project_requests(status);
CREATE INDEX IF NOT EXISTS idx_project_requests_created ON project_requests(created_at DESC);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_project_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_project_requests_updated_at ON project_requests;
CREATE TRIGGER trigger_project_requests_updated_at
  BEFORE UPDATE ON project_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_project_requests_updated_at();

-- Add comment
COMMENT ON TABLE project_requests IS 'Client-initiated project requests that go to super admin for proposal creation';
