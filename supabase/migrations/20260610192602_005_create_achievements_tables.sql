-- Create achievement definitions table (global achievements)
CREATE TABLE achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_achievements table (unlocked achievements)
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES achievement_definitions(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "achievement_definitions_select" ON achievement_definitions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "user_achievements_select_own" ON user_achievements FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "user_achievements_insert_own" ON user_achievements FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Insert default achievements
INSERT INTO achievement_definitions (id, title, description, icon) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Первый шаг', 'Выполните первую цель', '🎯'),
  ('00000000-0000-0000-0000-000000000002', 'Недельный воин', 'Продержитесь 7 дней подряд', '⚔️'),
  ('00000000-0000-0000-0000-000000000003', 'На огне', 'Продержитесь 14 дней подряд', '🔥'),
  ('00000000-0000-0000-0000-000000000004', 'Сотня', 'Выполните 100 целей', '💯'),
  ('00000000-0000-0000-0000-000000000005', 'Ранняя пташка', 'Выполните 5 целей до 8 утра', '🌅'),
  ('00000000-0000-0000-0000-000000000006', 'Ночная сова', 'Выполните 5 целей после 10 вечера', '🦉'),
  ('00000000-0000-0000-0000-000000000007', 'Перфекционист', 'Выполните все цели 7 дней подряд', '✨'),
  ('00000000-0000-0000-0000-000000000008', 'Марафонец', 'Завершите 30-дневную программу', '🏆'),
  ('00000000-0000-0000-0000-000000000009', 'Социальная бабочка', 'Поделитесь 10 достижениями', '🦋'),
  ('00000000-0000-0000-0000-000000000010', 'Новый уровень', 'Достигните 10 уровня', '🚀'),
  ('00000000-0000-0000-0000-000000000011', 'Целеустремлённый', 'Создайте 20 целей', '📝'),
  ('00000000-0000-0000-0000-000000000012', 'Неудержимый', 'Продержитесь 30 дней подряд', '⚡');