-- Motionify PM Portal - Magic Link Authentication Schema
-- Created: 2026-01-09
-- Purpose: Add magic_link_tokens table for passwordless authentication

-- ============================================================================
-- MAGIC_LINK_TOKENS TABLE
-- ============================================================================
-- Stores temporary tokens for magic link authentication
-- Tokens expire after 15 minutes and can only be used once

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP WITH TIME ZONE,
  remember_me BOOLEAN DEFAULT false
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email ON magic_link_tokens(email);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_token ON magic_link_tokens(token);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_unused ON magic_link_tokens(used_at) WHERE used_at IS NULL;

-- Add missing columns to sessions table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sessions' AND column_name = 'jwt_token_hash') THEN
    ALTER TABLE sessions ADD COLUMN jwt_token_hash VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sessions' AND column_name = 'remember_me') THEN
    ALTER TABLE sessions ADD COLUMN remember_me BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sessions' AND column_name = 'last_active_at') THEN
    ALTER TABLE sessions ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sessions' AND column_name = 'ip_address') THEN
    ALTER TABLE sessions ADD COLUMN ip_address INET;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sessions' AND column_name = 'user_agent') THEN
    ALTER TABLE sessions ADD COLUMN user_agent TEXT;
  END IF;
END $$;

-- Add last_login_at to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'profile_picture_url') THEN
    ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
  END IF;
END $$;

-- Display success message
SELECT 'Magic link authentication schema migration complete!' AS status;
