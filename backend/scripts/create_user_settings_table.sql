
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'system',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
