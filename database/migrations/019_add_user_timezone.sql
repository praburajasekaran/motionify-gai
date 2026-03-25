-- Migration 019: Add timezone to user_preferences
-- Allows users to set their preferred IANA timezone for date/time display
-- NULL means use browser default timezone

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN user_preferences.timezone IS
  'IANA timezone string (e.g., Asia/Kolkata, America/New_York). NULL means use browser default.';
