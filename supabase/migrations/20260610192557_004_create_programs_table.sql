-- Create programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  total_days INTEGER DEFAULT 30,
  current_day INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- RLS policies for programs
CREATE POLICY "programs_select_own" ON programs FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "programs_insert_own" ON programs FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "programs_update_own" ON programs FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);