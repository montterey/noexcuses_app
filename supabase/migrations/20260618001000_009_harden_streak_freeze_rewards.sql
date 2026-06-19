-- Backfill through the idempotent ledger, then require service_role for runtime mutations.

DO $$
DECLARE
  v_user record;
  v_achievement record;
  v_milestone integer;
BEGIN
  FOR v_user IN SELECT id, COALESCE(streak, 0) AS streak FROM public.users LOOP
    v_milestone := 7;

    WHILE v_milestone <= v_user.streak LOOP
      PERFORM public.grant_streak_freezes(
        v_user.id,
        'streak_milestone',
        v_milestone::text,
        1
      );
      v_milestone := v_milestone + 7;
    END LOOP;

    FOR v_achievement IN
      SELECT DISTINCT ua.achievement_id::text AS achievement_id
      FROM public.user_achievements ua
      WHERE ua.user_id = v_user.id
    LOOP
      PERFORM public.process_achievement_freeze_reward(
        v_user.id,
        v_achievement.achievement_id
      );
    END LOOP;

    PERFORM public.refill_streak_freezes(v_user.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_reward_service_role()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Reward mutations require service_role'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_streak_freeze(
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_active integer := 0;
  v_pending integer := 0;
  v_after_use integer := 0;
  v_refill integer := 0;
BEGIN
  PERFORM public.assert_reward_service_role();

  SELECT streak_freeze_count, streak_freeze_pending_count
  INTO v_active, v_pending
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_active <= 0 THEN
    RETURN false;
  END IF;

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
  PERFORM public.assert_reward_service_role();

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
  PERFORM public.assert_reward_service_role();

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

REVOKE EXECUTE ON FUNCTION public.assert_reward_service_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_achievement_freeze_reward_amount(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_streak_freezes(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refill_streak_freezes(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_freeze_reward(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_streak_freeze(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_streak_freeze_rewards(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_freeze_rewards(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_streak_freeze(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_streak_freeze_rewards(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_achievement_freeze_rewards(uuid) TO service_role;

-- Keep the ledger read-only for clients even if this migration is applied repeatedly.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.streak_freeze_reward_ledger
  FROM anon, authenticated;
