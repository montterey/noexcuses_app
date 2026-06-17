-- Harden streak freeze reward access before merge.
-- Client writes to the reward ledger are forbidden; user-facing RPCs verify auth.uid().

DROP POLICY IF EXISTS "streak_freeze_reward_ledger_select" ON public.streak_freeze_reward_ledger;
DROP POLICY IF EXISTS "streak_freeze_reward_ledger_insert" ON public.streak_freeze_reward_ledger;
DROP POLICY IF EXISTS "streak_freeze_reward_ledger_update" ON public.streak_freeze_reward_ledger;
DROP POLICY IF EXISTS "streak_freeze_reward_ledger_delete" ON public.streak_freeze_reward_ledger;

CREATE POLICY "streak_freeze_reward_ledger_select_own" ON public.streak_freeze_reward_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.streak_freeze_reward_ledger FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_reward_rpc_user(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN;
  END IF;

  IF auth.uid() = p_user_id THEN
    RETURN;
  END IF;

  RAISE EXCEPTION 'Not allowed to process rewards for this user'
    USING ERRCODE = '42501';
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

CREATE OR REPLACE FUNCTION public.consume_streak_freeze(
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_active integer := 0;
  v_pending integer := 0;
  v_after_use integer := 0;
  v_refill integer := 0;
BEGIN
  PERFORM public.assert_reward_rpc_user(p_user_id);

  SELECT COALESCE(streak_freeze_count, 0), COALESCE(streak_freeze_pending_count, 0)
  INTO v_active, v_pending
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_active <= 0 THEN
    RETURN false;
  END IF;

  v_after_use := v_active - 1;
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
  PERFORM public.assert_reward_rpc_user(p_user_id);

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

  IF public.grant_streak_freezes(p_user_id, 'achievement', v_key, v_amount) THEN
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
AS $$
DECLARE
  v_total integer := 0;
  v_row record;
BEGIN
  PERFORM public.assert_reward_rpc_user(p_user_id);

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

REVOKE EXECUTE ON FUNCTION public.assert_reward_rpc_user(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_streak_freezes(uuid, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refill_streak_freezes(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_freeze_reward(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_streak_freeze(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_streak_freeze_rewards(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_achievement_freeze_rewards(uuid) TO anon, authenticated;
