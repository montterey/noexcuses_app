-- Preserve existing overflow before enforcing the active balance cap.

UPDATE public.users
SET
  streak_freeze_pending_count = COALESCE(streak_freeze_pending_count, 0)
    + GREATEST(COALESCE(streak_freeze_count, 0) - 3, 0),
  streak_freeze_count = LEAST(GREATEST(COALESCE(streak_freeze_count, 0), 0), 3)
WHERE streak_freeze_count IS NULL
   OR streak_freeze_pending_count IS NULL
   OR streak_freeze_count < 0
   OR streak_freeze_count > 3
   OR streak_freeze_pending_count < 0;

UPDATE public.users
SET streak_freeze_pending_count = 0
WHERE streak_freeze_pending_count < 0;

ALTER TABLE public.users
  ALTER COLUMN streak_freeze_count SET NOT NULL;

ALTER TABLE public.users
  ALTER COLUMN streak_freeze_pending_count SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_streak_freeze_count_range'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_streak_freeze_count_range
      CHECK (streak_freeze_count BETWEEN 0 AND 3);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_streak_freeze_pending_nonnegative'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_streak_freeze_pending_nonnegative
      CHECK (streak_freeze_pending_count >= 0);
  END IF;
END;
$$;
