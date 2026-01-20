-- Add user_preferences table for Notification Settings (TC-NT-005)

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_task_assignment BOOLEAN DEFAULT true,
  email_mention BOOLEAN DEFAULT true,
  email_project_update BOOLEAN DEFAULT true,
  email_marketing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed preferences for existing users (optional, but good for consistency)
INSERT INTO user_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
