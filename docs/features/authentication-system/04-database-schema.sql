-- ============================================================================
-- Authentication System - Database Schema
-- ============================================================================
-- Database: Neon PostgreSQL
-- Version: 1.0
-- Created: January 18, 2025
--
-- This schema defines authentication-related tables:
-- - sessions: User session tracking for security
-- - password_reset_tokens: Password reset workflow
-- - email_verification_tokens: Email verification workflow
--
-- NOTE: The users table is defined in core-foundation schema
-- ============================================================================

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
-- Track user sessions for security and activity monitoring
-- Moved from admin-features to authentication-system (proper location)

CREATE TABLE IF NOT EXISTS sessions (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session Details
  jwt_token_hash VARCHAR(255) NOT NULL UNIQUE,
  remember_me BOOLEAN DEFAULT false,

  -- Session Lifecycle
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Status
  is_valid BOOLEAN DEFAULT true
);

-- Create indexes for session management
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_jwt_token_hash ON sessions(jwt_token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_is_valid ON sessions(is_valid) WHERE is_valid = true;
CREATE INDEX idx_sessions_user_active ON sessions(user_id, is_valid, expires_at) WHERE is_valid = true;

-- Trigger to update last_active_at
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sessions_last_active
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_last_active();

COMMENT ON TABLE sessions IS 'User session tracking for security and activity monitoring';
COMMENT ON COLUMN sessions.jwt_token_hash IS 'Hashed JWT token for session identification';
COMMENT ON COLUMN sessions.remember_me IS 'Whether this is an extended session (7 days vs 24 hours)';
COMMENT ON COLUMN sessions.is_valid IS 'False when session is invalidated (e.g., user logout, deactivation)';

-- ============================================================================
-- PASSWORD_RESET_TOKENS TABLE
-- ============================================================================
-- Secure password reset workflow
-- Tokens are single-use and expire after 1 hour

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Token Details
  token_hash VARCHAR(255) NOT NULL UNIQUE,  -- Hashed token (never store plain text)
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 1 hour from creation

  -- Usage Tracking
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,

  -- Context
  ip_address INET,  -- IP that requested reset
  user_agent TEXT,

  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX idx_password_reset_tokens_unused ON password_reset_tokens(used, expires_at)
  WHERE used = false;

COMMENT ON TABLE password_reset_tokens IS 'Password reset tokens with 1-hour expiry';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'Hashed token - never store plain text tokens';
COMMENT ON COLUMN password_reset_tokens.used IS 'Tokens are single-use only';

-- ============================================================================
-- EMAIL_VERIFICATION_TOKENS TABLE
-- ============================================================================
-- Email verification workflow for new users
-- Tokens expire after 24 hours

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  -- Core Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Token Details
  token_hash VARCHAR(255) NOT NULL UNIQUE,  -- Hashed token
  email VARCHAR(255) NOT NULL,  -- Email being verified
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- 24 hours from creation

  -- Usage Tracking
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Context
  ip_address INET,  -- IP that registered
  user_agent TEXT,

  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash);
CREATE INDEX idx_email_verification_tokens_email ON email_verification_tokens(email);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
CREATE INDEX idx_email_verification_tokens_unverified ON email_verification_tokens(verified, expires_at)
  WHERE verified = false;

COMMENT ON TABLE email_verification_tokens IS 'Email verification tokens with 24-hour expiry';
COMMENT ON COLUMN email_verification_tokens.token_hash IS 'Hashed token - never store plain text tokens';
COMMENT ON COLUMN email_verification_tokens.verified IS 'Tokens are single-use only';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to invalidate all user sessions (called on deactivation or password reset)
CREATE OR REPLACE FUNCTION invalidate_user_sessions(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE sessions
  SET is_valid = false
  WHERE user_id = target_user_id AND is_valid = true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION invalidate_user_sessions IS 'Invalidates all sessions for a user (called on deactivation or password reset)';

-- Function to clean up expired sessions (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM sessions
  WHERE expires_at < CURRENT_TIMESTAMP
    OR (is_valid = false AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_sessions IS 'Deletes expired and old invalid sessions (run periodically)';

-- Function to clean up expired/used password reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_password_reset_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < CURRENT_TIMESTAMP
    OR (used = true AND used_at < CURRENT_TIMESTAMP - INTERVAL '7 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_password_reset_tokens IS 'Deletes expired and old used password reset tokens (run periodically)';

-- Function to clean up expired/verified email verification tokens
CREATE OR REPLACE FUNCTION cleanup_expired_email_verification_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM email_verification_tokens
  WHERE expires_at < CURRENT_TIMESTAMP
    OR (verified = true AND verified_at < CURRENT_TIMESTAMP - INTERVAL '30 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_email_verification_tokens IS 'Deletes expired and old verified email tokens (run periodically)';

-- Function to check if user has valid session
CREATE OR REPLACE FUNCTION has_valid_session(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sessions
    WHERE user_id = target_user_id
      AND is_valid = true
      AND expires_at > CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION has_valid_session IS 'Checks if user has at least one valid active session';

-- ============================================================================
-- CLEANUP JOBS
-- ============================================================================
-- These functions should be scheduled to run periodically (e.g., daily via cron)
--
-- Recommended schedule:
-- - cleanup_expired_sessions(): Every 1 hour
-- - cleanup_expired_password_reset_tokens(): Daily
-- - cleanup_expired_email_verification_tokens(): Daily

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
--
-- TOKEN STORAGE:
-- - NEVER store plain text tokens in the database
-- - Always hash tokens before storage (e.g., using bcrypt, argon2, or SHA-256)
-- - Send plain text token to user once, then immediately discard it
-- - Compare hashed version when user submits token
--
-- SESSION MANAGEMENT:
-- - JWT tokens should also be hashed before storage
-- - Rotate sessions after password reset
-- - Implement rate limiting on authentication endpoints
-- - Consider implementing device fingerprinting
--
-- PASSWORD RESET:
-- - Limit password reset attempts per user (e.g., 3 per hour)
-- - Log all password reset requests for security auditing
-- - Send notification email when password is successfully reset
-- - Invalidate all sessions after successful password reset
--
-- EMAIL VERIFICATION:
-- - Users should not have full access until email is verified
-- - Consider adding email_verified column to users table
-- - Resend verification email with new token (invalidate old ones)
--
-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
