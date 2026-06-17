-- Streak freeze rewards are idempotent: every source/reward_key pair can reward a user once.
-- Active freezes are capped at 3; overflow is saved in streak_freeze_pending_count.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS streak_freeze_count integer DEFAULT 0;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS streak_freeze_pending_count integer DEFAULT 0;

UPDATE public.users
SET
  streak_freeze_count = COALESCE(streak_freeze_count, 0),
  streak_freeze_pending_count = COALESCE(streak_freeze_pending_count, 0);

ALTER TABLE public.users
ALTER COLUMN streak_freeze_count SET DEFAULT 0;

ALTER TABLE public.users
ALTER COLUMN streak_freeze_pending_count SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.streak_freeze_reward_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL,
  reward_key text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  active_granted integer NOT NULL DEFAULT 0,
  pending_granted integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, source, reward_key)
);

ALTER TABLE public.streak_freeze_reward_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'streak_freeze_reward_ledger'
      AND policyname = 'streak_freeze_reward_ledger_select'
  ) THEN
    CREATE POLICY "streak_freeze_reward_ledger_select" ON public.streak_freeze_reward_ledger FOR SELECT
      TO authenticated, anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'streak_freeze_reward_ledger'
      AND policyname = 'streak_freeze_reward_ledger_insert'
  ) THEN
    CREATE POLICY "streak_freeze_reward_ledger_insert" ON public.streak_freeze_reward_ledger FOR INSERT
      TO authenticated, anon
      WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE public.achievement_definitions
ADD COLUMN IF NOT EXISTS code text;

ALTER TABLE public.achievement_definitions
ADD COLUMN IF NOT EXISTS title_ru text;

ALTER TABLE public.achievement_definitions
ADD COLUMN IF NOT EXISTS description_ru text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_definitions' AND column_name = 'title'
  ) THEN
    EXECUTE $sql$UPDATE public.achievement_definitions SET title_ru = COALESCE(NULLIF(title_ru, ''), title)$sql$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'achievement_definitions' AND column_name = 'description'
  ) THEN
    EXECUTE $sql$UPDATE public.achievement_definitions SET description_ru = COALESCE(NULLIF(description_ru, ''), description)$sql$;
  END IF;
END $$;

UPDATE public.achievement_definitions
SET code = CASE
  WHEN id = '00000000-0000-0000-0000-000000000001'::uuid OR title_ru = 'Первый шаг' THEN 'first_step'
  WHEN id = '00000000-0000-0000-0000-000000000002'::uuid OR title_ru = 'Недельный воин' THEN 'weekly_warrior'
  WHEN id = '00000000-0000-0000-0000-000000000003'::uuid OR title_ru = 'На огне' THEN 'on_fire'
  WHEN id = '00000000-0000-0000-0000-000000000004'::uuid OR title_ru = 'Сотня' THEN 'hundred_goals'
  WHEN id = '00000000-0000-0000-0000-000000000005'::uuid OR title_ru = 'Ранняя пташка' THEN 'early_bird'
  WHEN id = '00000000-0000-0000-0000-000000000006'::uuid OR title_ru = 'Ночная сова' THEN 'night_owl'
  WHEN id = '00000000-0000-0000-0000-000000000007'::uuid OR title_ru = 'Перфекционист' THEN 'perfectionist'
  WHEN id = '00000000-0000-0000-0000-000000000008'::uuid OR title_ru = 'Марафонец' THEN 'marathoner'
  WHEN id = '00000000-0000-0000-0000-000000000009'::uuid OR title_ru = 'Социальная бабочка' THEN 'social_butterfly'
  WHEN id = '00000000-0000-0000-0000-000000000010'::uuid OR title_ru = 'Новый уровень' THEN 'new_level'
  WHEN id = '00000000-0000-0000-0000-000000000011'::uuid OR title_ru = 'Целеустремлённый' THEN 'goal_oriented'
  WHEN id = '00000000-0000-0000-0000-000000000012'::uuid OR title_ru = 'Неудержимый' THEN 'unstoppable'
  WHEN title_ru = 'Месяц дисциплины' THEN 'month_discipline'
  WHEN title_ru = 'Железная крепость' THEN 'iron_fortress'
  WHEN title_ru = 'Воин NoExcuses' THEN 'noexcuses_warrior'
  WHEN title_ru = '100 дней подряд' THEN 'hundred_days_streak'
  WHEN title_ru = 'Несокрушимый' THEN 'unbreakable'
  ELSE code
END
WHERE code IS NULL OR code = '';

CREATE INDEX IF NOT EXISTS achievement_definitions_code_idx
ON public.achievement_definitions(code)
WHERE code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_achievement_freeze_reward_amount(
  p_code text,
  p_title text
)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_code text := lower(COALESCE(p_code, ''));
  v_title text := COALESCE(p_title, '');
BEGIN
  RETURN CASE
    WHEN v_code = 'month_discipline' OR v_title = 'Месяц дисциплины' THEN 1
    WHEN v_code = 'iron_fortress' OR v_title = 'Железная крепость' THEN 1
    WHEN v_code = 'noexcuses_warrior' OR v_title = 'Воин NoExcuses' THEN 1
    WHEN v_code = 'hundred_days_streak' OR v_title = '100 дней подряд' THEN 2
    WHEN v_code = 'unbreakable' OR v_title = 'Несокрушимый' THEN 2
    ELSE 0
  END;
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
    streak_freeze_pending_count = v_pending + v_pending_grant,
    updated_at = now()
  WHERE id = p_user_id;

  UPDATE public.streak_freeze_reward_ledger
  SET active_granted = v_active_grant,
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
      streak_freeze_pending_count = v_pending - v_refill,
      updated_at = now()
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
    IF public.grant_streak_freezes(p_user_id, 'streak_milestone', v_milestone::text, 1) THEN
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
  p_achievement_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code text;
  v_title text;
  v_amount integer := 0;
  v_key text;
BEGIN
  SELECT code, title_ru
  INTO v_code, v_title
  FROM public.achievement_definitions
  WHERE id = p_achievement_id;

  v_amount := public.get_achievement_freeze_reward_amount(v_code, v_title);

  IF v_amount <= 0 THEN
    RETURN 0;
  END IF;

  v_key := COALESCE(NULLIF(v_code, ''), p_achievement_id::text);
  PERFORM public.grant_streak_freezes(p_user_id, 'achievement', v_key, v_amount);
  PERFORM public.refill_streak_freezes(p_user_id);

  RETURN v_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_achievement_freeze_rewards(
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer := 0;
  v_row record;
BEGIN
  FOR v_row IN
    SELECT ua.achievement_id
    FROM public.user_achievements ua
    WHERE ua.user_id = p_user_id
  LOOP
    v_total := v_total + public.process_achievement_freeze_reward(p_user_id, v_row.achievement_id);
  END LOOP;

  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_freezes_after_achievement_unlock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.process_achievement_freeze_reward(NEW.user_id, NEW.achievement_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_achievements_award_freezes ON public.user_achievements;

CREATE TRIGGER user_achievements_award_freezes
AFTER INSERT ON public.user_achievements
FOR EACH ROW
EXECUTE FUNCTION public.award_freezes_after_achievement_unlock();

-- Backfill already reached 7-day streak milestones and already unlocked achievement rewards.
DO $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN SELECT id FROM public.users LOOP
    PERFORM public.process_streak_freeze_rewards(v_user.id);
    PERFORM public.process_achievement_freeze_rewards(v_user.id);
    PERFORM public.refill_streak_freezes(v_user.id);
  END LOOP;
END $$;
