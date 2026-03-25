-- ============================================================================
-- Core Foundation - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: 2025-01-18
--
-- This schema defines the foundational tables that all other features depend on.
-- This MUST be the first migration to run, as all other schemas reference these tables.
--
-- Tables defined here:
-- - users: User accounts and authentication
-- - projects: Client projects
-- - deliverables: Project deliverables
-- - files: File metadata (physical files stored in Cloudflare R2)
-- - activities: Comprehensive activity/audit log
-- ============================================================================

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Core user accounts table
-- Extended by admin-features with additional fields

CREATE TABLE IF NOT EXISTS users (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false NOT NULL,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(512),  -- Profile picture URL

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_user_role CHECK (role IN ('super_admin', 'project_manager', 'client', 'team_member'))
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

COMMENT ON TABLE users IS 'Core user accounts table - extended by admin-features schema';
COMMENT ON COLUMN users.role IS 'User role: super_admin, project_manager, or client';

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
-- Core projects table
-- Extended by admin-features with status tracking fields

CREATE TABLE IF NOT EXISTS projects (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Revision Tracking (from payment-workflow)
  total_revisions INTEGER NOT NULL DEFAULT 3,
  used_revisions INTEGER NOT NULL DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_revision_counts CHECK (
    used_revisions >= 0 AND
    used_revisions <= total_revisions AND
    total_revisions >= 0
  )
);

-- Indexes
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_projects_updated_at();

COMMENT ON TABLE projects IS 'Core projects table - extended by admin-features schema';
COMMENT ON COLUMN projects.total_revisions IS 'Total number of revisions included in project package';
COMMENT ON COLUMN projects.used_revisions IS 'Number of revisions consumed';

-- ============================================================================
-- DELIVERABLES TABLE
-- ============================================================================
-- Project deliverables with approval workflow tracking
-- Moved from deliverable-approval to core foundation

CREATE TABLE IF NOT EXISTS deliverables (
  -- Core Identification
  id UUID PRIMARY KEY,  -- Preserved from ProposalDeliverable.id
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- From Proposal (preserved during conversion)
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  estimated_completion_week INT,  -- Week number (1-52)
  format VARCHAR(255),  -- e.g., "MP4, 1080p, 4K"

  -- Workflow Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  display_order INT NOT NULL,  -- Order in deliverables list (1, 2, 3...)

  -- Beta Delivery
  beta_file_id UUID,  -- FK added after files table exists
  beta_uploaded_at TIMESTAMP WITH TIME ZONE,
  beta_uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Approval Tracking
  awaiting_approval_since TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_feedback TEXT,

  -- Final Delivery
  final_file_id UUID,  -- FK added after files table exists
  final_uploaded_at TIMESTAMP WITH TIME ZONE,
  final_uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  final_delivered_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,  -- 365 days after final_delivered_at

  -- Payment Integration
  balance_payment_required BOOLEAN NOT NULL DEFAULT true,
  balance_payment_received BOOLEAN NOT NULL DEFAULT false,
  balance_payment_received_at TIMESTAMP WITH TIME ZONE,

  -- Revision Tracking (linked to project-level quota)
  revisions_consumed INT NOT NULL DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_deliverable_status CHECK (
    status IN (
      'pending',
      'in_progress',
      'beta_ready',
      'awaiting_approval',
      'approved',
      'payment_pending',
      'final_delivered',
      'rejected',
      'revision_requested',
      'expired'
    )
  ),
  CONSTRAINT valid_display_order CHECK (display_order > 0),
  CONSTRAINT valid_completion_week CHECK (
    estimated_completion_week IS NULL OR
    (estimated_completion_week >= 1 AND estimated_completion_week <= 52)
  )
);

-- Indexes for performance
CREATE INDEX idx_deliverables_project_id ON deliverables(project_id);
CREATE INDEX idx_deliverables_status ON deliverables(status);
CREATE INDEX idx_deliverables_project_order ON deliverables(project_id, display_order);
CREATE INDEX idx_deliverables_expires_at ON deliverables(expires_at)
  WHERE expires_at IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deliverables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deliverables_updated_at
  BEFORE UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION update_deliverables_updated_at();

-- Trigger to auto-calculate expiry date
CREATE OR REPLACE FUNCTION set_deliverable_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- When final_delivered_at is set, calculate expires_at (365 days later)
  IF NEW.final_delivered_at IS NOT NULL AND OLD.final_delivered_at IS NULL THEN
    NEW.expires_at = NEW.final_delivered_at + INTERVAL '365 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_deliverable_expiry
  BEFORE UPDATE ON deliverables
  FOR EACH ROW
  EXECUTE FUNCTION set_deliverable_expiry();

COMMENT ON TABLE deliverables IS 'Project deliverables with approval workflow tracking';
COMMENT ON COLUMN deliverables.id IS 'Preserved from ProposalDeliverable.id during project conversion';
COMMENT ON COLUMN deliverables.status IS 'Deliverable workflow status';
COMMENT ON COLUMN deliverables.expires_at IS 'Access expires 365 days after final delivery';

-- ============================================================================
-- FILES TABLE
-- ============================================================================
-- File metadata for all uploaded files
-- Physical files stored in Cloudflare R2
-- Moved from file-management to core foundation

CREATE TABLE IF NOT EXISTS files (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- File Metadata
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,  -- Size in bytes
  mime_type VARCHAR(100) NOT NULL,
  description TEXT,

  -- Cloudflare R2 Storage
  storage_key VARCHAR(512) NOT NULL UNIQUE,  -- R2 object key (unique path)
  storage_url TEXT NOT NULL,  -- Base R2 URL

  -- Relationships
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES deliverables(id) ON DELETE RESTRICT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Deliverable-Specific Fields
  file_type VARCHAR(20),  -- 'beta' | 'final' | 'other'
  is_watermarked BOOLEAN DEFAULT false,

  -- Access Control & Expiry
  expires_at TIMESTAMP WITH TIME ZONE,  -- Auto-set when deliverable final_delivered
  is_deleted BOOLEAN DEFAULT false,  -- Soft delete for data retention

  -- Optional Tracking
  download_count INT DEFAULT 0,
  last_downloaded_at TIMESTAMP WITH TIME ZONE,
  last_downloaded_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 524288000),  -- Max 500MB
  CONSTRAINT valid_file_name CHECK (char_length(file_name) > 0),
  CONSTRAINT valid_file_type CHECK (
    file_type IS NULL OR file_type IN ('beta', 'final', 'other')
  )
);

-- Indexes for Performance
CREATE INDEX idx_files_project_id ON files(project_id) WHERE is_deleted = false;
CREATE INDEX idx_files_deliverable_id ON files(deliverable_id) WHERE is_deleted = false;
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
CREATE INDEX idx_files_file_name ON files(file_name);
CREATE INDEX idx_files_expires_at ON files(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_files_storage_key ON files(storage_key);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_files_updated_at();

-- Trigger to set expiry date when deliverable is finalized
CREATE OR REPLACE FUNCTION set_file_expiry_on_deliverable_finalized()
RETURNS TRIGGER AS $$
BEGIN
  -- When deliverable marked as final_delivered
  IF NEW.final_delivered_at IS NOT NULL AND OLD.final_delivered_at IS NULL THEN
    -- Update all files in this deliverable to expire in 365 days
    UPDATE files
    SET expires_at = NEW.final_delivered_at + INTERVAL '365 days'
    WHERE deliverable_id = NEW.id
      AND is_deleted = false
      AND expires_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_file_expiry
  AFTER UPDATE ON deliverables
  FOR EACH ROW
  WHEN (NEW.final_delivered_at IS NOT NULL AND OLD.final_delivered_at IS NULL)
  EXECUTE FUNCTION set_file_expiry_on_deliverable_finalized();

COMMENT ON TABLE files IS 'File metadata for project deliverables stored in Cloudflare R2';
COMMENT ON COLUMN files.storage_key IS 'R2 object key - unique path in bucket';
COMMENT ON COLUMN files.expires_at IS 'Access expires 365 days after deliverable finalized';

-- Now add foreign key constraints to deliverables for file references
ALTER TABLE deliverables
  ADD CONSTRAINT fk_deliverables_beta_file
  FOREIGN KEY (beta_file_id) REFERENCES files(id) ON DELETE SET NULL;

ALTER TABLE deliverables
  ADD CONSTRAINT fk_deliverables_final_file
  FOREIGN KEY (final_file_id) REFERENCES files(id) ON DELETE SET NULL;

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================
-- Comprehensive audit log for all user actions in the system
-- Moved from admin-features to core foundation

CREATE TABLE IF NOT EXISTS activities (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

  -- Action Details
  action_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,

  -- Descriptive Information
  description TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  -- Note: No CHECK constraint on action_type to allow features to add new types
  -- See ACTIVITY_TYPES.md for complete list of all activity types
  CONSTRAINT valid_entity_type CHECK (
    entity_type IN ('user', 'project', 'task', 'file', 'comment', 'deliverable', 'team', 'terms')
  )
);

-- Create indexes for performance
CREATE INDEX idx_activities_project_id ON activities(project_id);
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_action_type ON activities(action_type);
CREATE INDEX idx_activities_entity_type ON activities(entity_type);
CREATE INDEX idx_activities_entity_id ON activities(entity_id);
CREATE INDEX idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX idx_activities_project_timestamp ON activities(project_id, timestamp DESC);
CREATE INDEX idx_activities_user_timestamp ON activities(user_id, timestamp DESC);

-- GIN index for JSONB details for efficient querying
CREATE INDEX idx_activities_details ON activities USING GIN (details);

-- Composite index for common filter combinations
CREATE INDEX idx_activities_project_user_timestamp ON activities(project_id, user_id, timestamp DESC);
CREATE INDEX idx_activities_project_action_timestamp ON activities(project_id, action_type, timestamp DESC);

COMMENT ON TABLE activities IS 'Comprehensive audit log of all user actions in the system';
COMMENT ON COLUMN activities.action_type IS 'Type of action performed (e.g., task_created, file_uploaded)';
COMMENT ON COLUMN activities.entity_type IS 'Type of entity affected (e.g., task, file, user)';
COMMENT ON COLUMN activities.entity_id IS 'UUID of the affected entity';
COMMENT ON COLUMN activities.details IS 'JSON object with action-specific details';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to log activity (utility for application code)
CREATE OR REPLACE FUNCTION log_activity(
  p_project_id UUID,
  p_user_id UUID,
  p_action_type VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_description TEXT,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO activities (
    project_id,
    user_id,
    action_type,
    entity_type,
    entity_id,
    description,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_project_id,
    p_user_id,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_description,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_activity IS 'Utility function to create activity log entries';

-- ============================================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================================

-- Sample super admin user (only insert if no super admins exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'super_admin') THEN
    INSERT INTO users (
      email,
      full_name,
      role,
      created_at
    ) VALUES (
      'admin@motionify.studio',
      'System Administrator',
      'super_admin',
      CURRENT_TIMESTAMP
    );
  END IF;
END $$;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
