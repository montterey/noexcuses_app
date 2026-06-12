-- Create goals table
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'once')),
  time TEXT,
  why TEXT,
  streak INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for goals
CREATE POLICY "goals_select_own" ON goals FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "goals_insert_own" ON goals FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "goals_update_own" ON goals FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "goals_delete_own" ON goals FOR DELETE
  TO authenticated, anon
  USING (true);