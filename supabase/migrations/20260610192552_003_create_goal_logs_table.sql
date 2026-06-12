-- Create goal_logs table for tracking goal completions
CREATE TABLE goal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'done',
  completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE goal_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for goal_logs
CREATE POLICY "goal_logs_select_own" ON goal_logs FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "goal_logs_insert_own" ON goal_logs FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_goal_logs_goal_date ON goal_logs(goal_id, completed_at);
CREATE INDEX idx_goal_logs_user_date ON goal_logs(user_id, completed_at);