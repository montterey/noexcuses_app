-- Prepare streak freeze rewards without assuming legacy achievement primary keys.
-- Runtime reward mutations are restricted to service_role; backfill runs later in 009.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS streak_freeze_count integer DEFAULT 0;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS streak_freeze_pending_count integer DEFAULT 0;

UPDATE public.users
SET
  streak_freeze_count = COALESCE(streak_freeze_count, 0),
  streak_freeze_pending_count = COALESCE(streak_freeze_pending_count, 0)
WHERE streak_freeze_count IS NULL
   OR streak_freeze_pending_count IS NULL;

ALTER TABLE public.users
  ALTER COLUMN streak_freeze_count SET DEFAULT 0;

ALTER TABLE public.users
  ALTER COLUMN streak_freeze_pending_count SET DEFAULT 0;

-- The original goal_logs migration used completed_at. The app and reward RPCs use date/xp_earned.
ALTER TABLE public.goal_logs
  ADD COLUMN IF NOT EXISTS date date;

ALTER TABLE public.goal_logs
  ADD COLUMN IF NOT EXISTS xp_earned integer DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'goal_logs'
      AND column_name = 'completed_at'
  ) THEN
    EXECUTE $sql$
      UPDATE public.goal_logs
      SET date = COALESCE(date, completed_at, CURRENT_DATE)
      WHERE date IS NULL
    $sql$;
  ELSE
    UPDATE public.goal_logs
    SET date = CURRENT_DATE
    WHERE date IS NULL;
  END IF;
END;
$$;

UPDATE public.goal_logs
SET xp_earned = 0
WHERE xp_earned IS NULL;

ALTER TABLE public.goal_logs
  ALTER COLUMN date SET DEFAULT CURRENT_DATE;

ALTER TABLE public.goal_logs
  ALTER COLUMN date SET NOT NULL;

ALTER TABLE public.goal_logs
  ALTER COLUMN xp_earned SET DEFAULT 0;

ALTER TABLE public.goal_logs
  ALTER COLUMN xp_earned SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_goal_logs_goal_date_v2
  ON public.goal_logs(goal_id, date);

CREATE INDEX IF NOT EXISTS idx_goal_logs_user_date_v2
  ON public.goal_logs(user_id, date);

CREATE TABLE IF NOT EXISTS public.streak_freeze_reward_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL,
  reward_key text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  active_granted integer NOT NULL DEFAULT 0,
  pending_granted integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source, reward_key)
);

ALTER TABLE public.streak_freeze_reward_ledger ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'streak_freeze_reward_ledger'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.streak_freeze_reward_ledger',
      v_policy.policyname
    );
  END LOOP;
END;
$$;

CREATE POLICY "streak_freeze_reward_ledger_select_own"
  ON public.streak_freeze_reward_ledger
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.streak_freeze_reward_ledger FROM anon, authenticated;
GRANT SELECT ON public.streak_freeze_reward_ledger TO authenticated;

-- Align legacy clean installs with the live achievement definition shape.
ALTER TABLE public.achievement_definitions ADD COLUMN IF NOT EXISTS code text;
ALTER TABLE public.achievement_definitions ADD COLUMN IF NOT EXISTS title_ru text;
ALTER TABLE public.achievement_definitions ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.achievement_definitions ADD COLUMN IF NOT EXISTS description_ru text;
ALTER TABLE public.achievement_definitions ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.achievement_definitions ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'achievement_definitions'
      AND column_name = 'title'
  ) THEN
    EXECUTE $sql$
      UPDATE public.achievement_definitions
      SET title_ru = COALESCE(NULLIF(title_ru, ''), title)
      WHERE title_ru IS NULL OR title_ru = ''
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'achievement_definitions'
      AND column_name = 'description'
  ) THEN
    EXECUTE $sql$
      UPDATE public.achievement_definitions
      SET description_ru = COALESCE(NULLIF(description_ru, ''), description)
      WHERE description_ru IS NULL OR description_ru = ''
    $sql$;
  END IF;
END;
$$;

UPDATE public.achievement_definitions
SET code = CASE title_ru
  WHEN 'Первый шаг' THEN 'first_step'
  WHEN 'Недельный воин' THEN 'weekly_warrior'
  WHEN 'На огне' THEN 'on_fire'
  WHEN 'Сотня' THEN 'hundred_goals'
  WHEN 'Ранняя пташка' THEN 'early_bird'
  WHEN 'Ночная сова' THEN 'night_owl'
  WHEN 'Перфекционист' THEN 'perfectionist'
  WHEN 'Марафонец' THEN 'marathoner'
  WHEN 'Социальная бабочка' THEN 'social_butterfly'
  WHEN 'Новый уровень' THEN 'new_level'
  WHEN 'Целеустремлённый' THEN 'goal_oriented'
  WHEN 'Неудержимый' THEN 'unstoppable'
  WHEN 'Месяц дисциплины' THEN 'month_discipline'
  WHEN 'Железная крепость' THEN 'iron_fortress'
  WHEN 'Воин NoExcuses' THEN 'noexcuses_warrior'
  WHEN '100 дней подряд' THEN 'hundred_days_streak'
  WHEN 'Несокрушимый' THEN 'unbreakable'
  ELSE code
END
WHERE code IS NULL OR code = '';

CREATE INDEX IF NOT EXISTS achievement_definitions_code_idx
  ON public.achievement_definitions(code)
  WHERE code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_achievement_freeze_reward_amount(
  p_code text
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE lower(COALESCE(p_code, ''))
    WHEN 'month_discipline' THEN 1
    WHEN 'iron_fortress' THEN 1
    WHEN 'noexcuses_warrior' THEN 1
    WHEN 'hundred_days_streak' THEN 2
    WHEN 'unbreakable' THEN 2
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.grant_streak_freezes(
  p_user_id uuid,
  p_source text,
  p_reward_key text,
  p_amount integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted boolean := false;
  v_active integer := 0;
  v_pending integer := 0;
  v_active_grant integer := 0;
  v_pending_grant integer := 0;
BEGIN
  IF p_user_id IS NULL OR p_amount IS NULL OR p_amount <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.streak_freeze_reward_ledger (user_id, source, reward_key, amount)
  VALUES (p_user_id, p_source, p_reward_key, p_amount)
  ON CONFLICT (user_id, source, reward_key) DO NOTHING
  RETURNING true INTO v_inserted;

  IF NOT COALESCE(v_inserted, false) THEN
    RETURN false;
  END IF;

  SELECT COALESCE(streak_freeze_count, 0), COALESCE(streak_freeze_pending_count, 0)
  INTO v_active, v_pending
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  v_active_grant := LEAST(GREATEST(3 - v_active, 0), p_amount);
  v_pending_grant := p_amount - v_active_grant;

  UPDATE public.users
  SET
    streak_freeze_count = LEAST(3, v_active + v_active_grant),
    streak_freeze_pending_count = v_pending + v_pending_grant
  WHERE id = p_user_id;

  UPDATE public.streak_freeze_reward_ledger
  SET
    active_granted = v_active_grant,
    pending_granted = v_pending_grant
  WHERE user_id = p_user_id
    AND source = p_source
    AND reward_key = p_reward_key;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refill_streak_freezes(
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active integer := 0;
  v_pending integer := 0;
  v_refill integer := 0;
BEGIN
  SELECT COALESCE(streak_freeze_count, 0), COALESCE(streak_freeze_pending_count, 0)
  INTO v_active, v_pending
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  v_refill := LEAST(GREATEST(3 - v_active, 0), v_pending);

  IF v_refill > 0 THEN
    UPDATE public.users
    SET
      streak_freeze_count = v_active + v_refill,
      streak_freeze_pending_count = v_pending - v_refill
    WHERE id = p_user_id;
  END IF;

  RETURN v_refill;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_streak_freeze_rewards(
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_streak integer := 0;
  v_milestone integer := 7;
  v_granted_count integer := 0;
BEGIN
  SELECT COALESCE(streak, 0)
  INTO v_streak
  FROM public.users
  WHERE id = p_user_id;

  WHILE v_milestone <= v_streak LOOP
    IF public.grant_streak_freezes(
      p_user_id,
      'streak_milestone',
      v_milestone::text,
      1
    ) THEN
      v_granted_count := v_granted_count + 1;
    END IF;

    v_milestone := v_milestone + 7;
  END LOOP;

  PERFORM public.refill_streak_freezes(p_user_id);
  RETURN v_granted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_achievement_freeze_reward(
  p_user_id uuid,
  p_achievement_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text;
  v_amount integer := 0;
BEGIN
  SELECT ad.code
  INTO v_code
  FROM public.achievement_definitions ad
  WHERE ad.code = p_achievement_id;

  v_amount := public.get_achievement_freeze_reward_amount(v_code);

  IF v_amount <= 0 THEN
    RETURN 0;
  END IF;

  IF public.grant_streak_freezes(
    p_user_id,
    'achievement',
    v_code,
    v_amount
  ) THEN
    PERFORM public.refill_streak_freezes(p_user_id);
    RETURN v_amount;
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_achievement_freeze_rewards(
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total integer := 0;
  v_row record;
BEGIN
  FOR v_row IN
    SELECT DISTINCT ua.achievement_id::text AS achievement_id
    FROM public.user_achievements ua
    WHERE ua.user_id = p_user_id
  LOOP
    v_total := v_total + public.process_achievement_freeze_reward(
      p_user_id,
      v_row.achievement_id
    );
  END LOOP;

  RETURN v_total;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_achievement_freeze_reward_amount(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_streak_freezes(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refill_streak_freezes(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_freeze_reward(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_streak_freeze_rewards(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_freeze_rewards(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_streak_freeze_rewards(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_achievement_freeze_rewards(uuid) TO service_role;
