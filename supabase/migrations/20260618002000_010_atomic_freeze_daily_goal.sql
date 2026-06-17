-- Freeze a daily goal atomically: log the freeze, consume active balance,
-- and refill from pending balance inside one SECURITY DEFINER RPC.

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
  v_goal_id uuid;
  v_active integer := 0;
  v_pending integer := 0;
  v_after_use integer := 0;
  v_refill integer := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not allowed to freeze goals for this user'
      USING ERRCODE = '42501';
  END IF;

  SELECT g.id
  INTO v_goal_id
  FROM public.goals g
  WHERE g.id = p_goal_id
    AND g.user_id = p_user_id
    AND COALESCE(g.active, true) = true
    AND COALESCE(g.frequency, g.type) = 'daily'
  FOR SHARE;

  IF v_goal_id IS NULL THEN
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

GRANT EXECUTE ON FUNCTION public.freeze_daily_goal(uuid, uuid, date) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.consume_streak_freeze(uuid) FROM PUBLIC, anon, authenticated;
