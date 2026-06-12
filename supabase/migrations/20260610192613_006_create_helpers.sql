-- Create a view for weekly stats
CREATE OR REPLACE VIEW weekly_goal_stats AS
SELECT 
  user_id,
  DATE_TRUNC('week', completed_at) as week_start,
  COUNT(*) as completed_count
FROM goal_logs
WHERE completed_at >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY user_id, DATE_TRUNC('week', completed_at);

-- Create function to get or create user
CREATE OR REPLACE FUNCTION get_or_create_user(
  p_telegram_id BIGINT,
  p_username TEXT,
  p_first_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Try to get existing user
  SELECT id INTO v_user_id FROM users WHERE telegram_id = p_telegram_id;
  
  -- If not exists, create new user
  IF v_user_id IS NULL THEN
    INSERT INTO users (telegram_id, username, first_name)
    VALUES (p_telegram_id, p_username, p_first_name)
    RETURNING id INTO v_user_id;
    
    -- Create default programs for new user
    INSERT INTO programs (user_id, title, description, icon, total_days)
    VALUES 
      (v_user_id, '30-дневный фитнес-курс', 'Наберите силу, выносливость и гибкость с ежедневными тренировками', '🏋️', 30),
      (v_user_id, '30-дневное похудение', 'Сочетание правильного питания и упражнений для устойчивого результата', '🔥', 30),
      (v_user_id, '30-дневный курс обучения', 'Освойте новые навыки с ежедневными занятиями и проверками знаний', '📚', 30);
  END IF;
  
  RETURN v_user_id;
END;
$$;