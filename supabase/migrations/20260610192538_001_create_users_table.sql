-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_goals_completed INTEGER DEFAULT 0,
  xp_this_week INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS policies for users
CREATE POLICY "users_select_own" ON users FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "users_insert_own" ON users FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);