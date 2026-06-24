ALTER TABLE public.goal_logs
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

UPDATE public.goal_logs
SET created_at = COALESCE(created_at, date::timestamptz, now())
WHERE created_at IS NULL;
