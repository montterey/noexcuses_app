-- Atomically freeze today's daily goal and refill active balance from pending.
-- Migration 002 guarantees goals.type/active; migration 007 guarantees goal_logs.date/xp_earned.

CREATE OR REPLACE FUNCTION public.freeze_daily_goal(
  p_user_id uuid,
  p_goal_id uuid,
  p_date date
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_goal_id uuid;
  v_active integer := 0;
  v_pending integer := 0;
  v_after_use integer := 0;
  v_refill integer := 0;
BEGIN
  PERFORM public.assert_reward_service_role();

  IF p_user_id IS NULL OR p_goal_id IS NULL OR p_date IS NULL THEN
    RETURN false;
  END IF;

  SELECT g.id
  INTO v_goal_id
  FROM public.goals g
  WHERE g.id = p_goal_id
    AND g.user_id = p_user_id
    AND g.type = 'daily'
    AND COALESCE(g.active, true) = true
  FOR SHARE;

  IF v_goal_id IS NULL THEN
    RETURN false;
  END IF;

  -- Serialize the check/insert pair even on databases without a unique goal/date constraint.
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

  SELECT streak_freeze_count, streak_freeze_pending_count
  INTO v_active, v_pending
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_active <= 0 THEN
    RETURN false;
  END IF;

  INSERT INTO public.goal_logs (
    goal_id,
    user_id,
    status,
    date,
    xp_earned
  )
  VALUES (
    p_goal_id,
    p_user_id,
    'frozen',
    p_date,
    0
  );

  v_after_use := GREATEST(v_active - 1, 0);
  v_refill := LEAST(GREATEST(3 - v_after_use, 0), v_pending);

  UPDATE public.users
  SET
    streak_freeze_count = v_after_use + v_refill,
    streak_freeze_pending_count = v_pending - v_refill
  WHERE id = p_user_id;

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.freeze_daily_goal(uuid, uuid, date)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.freeze_daily_goal(uuid, uuid, date)
  TO service_role;
