-- Keep active streak freeze balance capped at 3.
-- Existing overflow is preserved in pending balance instead of being lost.

UPDATE public.users
SET
  streak_freeze_pending_count = COALESCE(streak_freeze_pending_count, 0) + GREATEST(COALESCE(streak_freeze_count, 0) - 3, 0),
  streak_freeze_count = LEAST(COALESCE(streak_freeze_count, 0), 3)
WHERE COALESCE(streak_freeze_count, 0) > 3
   OR streak_freeze_count IS NULL
   OR streak_freeze_pending_count IS NULL;
