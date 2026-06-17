-- This app does not use Supabase Auth for Telegram users.
-- Reward mutations must go through the Vercel API, which verifies Telegram initData
-- and calls these RPCs with the Supabase service role.

CREATE OR REPLACE FUNCTION public.freeze_daily_goal(
  p_user_id uuid,
  p_goal_id uuid,
  p_date date
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_frequency boolean := false;
  v_goal_kind text;
  v_active integer := 0;
  v_pending integer := 0;
  v_after_use integer := 0;
  v_refill integer := 0;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not allowed to freeze goals directly'
      USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'goals'
      AND column_name = 'frequency'
  )
  INTO v_has_frequency;

  IF v_has_frequency THEN
    EXECUTE $sql$
      SELECT COALESCE(frequency, type)
      FROM public.goals
      WHERE id = $1
        AND user_id = $2
        AND COALESCE(active, true) = true
      FOR SHARE
    $sql$
    INTO v_goal_kind
    USING p_goal_id, p_user_id;
  ELSE
    SELECT g.type
    INTO v_goal_kind
    FROM public.goals g
    WHERE g.id = p_goal_id
      AND g.user_id = p_user_id
      AND COALESCE(g.active, true) = true
    FOR SHARE;
  END IF;

  IF v_goal_kind IS DISTINCT FROM 'daily' THEN
    RETURN false;
  END IF;

  LOCK TABLE public.goal_logs IN SHARE ROW EXCLUSIVE MODE;

  IF EXISTS (
    SELECT 1
    FROM public.goal_logs gl
    WHERE gl.user_id = p_user_id
      AND gl.goal_id = p_goal_id
      AND gl.date = p_date
  ) THEN
    RETURN false;
  END IF;

  SELECT COALESCE(streak_freeze_count, 0), COALESCE(streak_freeze_pending_count, 0)
  INTO v_active, v_pending
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_active <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.goal_logs (goal_id, user_id, status, date, xp_earned)
  VALUES (p_goal_id, p_user_id, 'frozen', p_date, 0);

  v_after_use := GREATEST(v_active - 1, 0);
  v_refill := LEAST(GREATEST(3 - v_after_use, 0), v_pending);

  UPDATE public.users
  SET
    streak_freeze_count = v_after_use + v_refill,
    streak_freeze_pending_count = v_pending - v_refill,
    updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.freeze_daily_goal(uuid, uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_streak_freeze(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_streak_freeze_rewards(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_freeze_rewards(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_freeze_reward(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.freeze_daily_goal(uuid, uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_streak_freeze_rewards(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_achievement_freeze_rewards(uuid) TO service_role;
