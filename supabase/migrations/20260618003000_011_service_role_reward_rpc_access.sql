-- Final access hardening for the Vercel rewards API contract.

ALTER TABLE public.streak_freeze_reward_ledger ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.streak_freeze_reward_ledger
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.assert_reward_service_role()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_achievement_freeze_reward_amount(text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_streak_freezes(uuid, text, text, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refill_streak_freezes(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_freeze_reward(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_streak_freeze(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_streak_freeze_rewards(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_achievement_freeze_rewards(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.freeze_daily_goal(uuid, uuid, date)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_streak_freeze(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.process_streak_freeze_rewards(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.process_achievement_freeze_rewards(uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.freeze_daily_goal(uuid, uuid, date)
  TO service_role;
