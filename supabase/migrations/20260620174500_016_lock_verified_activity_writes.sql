-- Apply only after PR #13 is merged and the production Vercel deployment is successful.
-- This removes the legacy client write paths after the new API is live.
REVOKE INSERT,UPDATE,DELETE ON public.goal_logs FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.user_programs FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.program_day_completions FROM anon,authenticated;
GRANT SELECT ON public.goal_logs,public.user_programs,public.program_day_completions TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.protect_user_progress_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=public,pg_temp
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND (
    NEW.xp IS DISTINCT FROM OLD.xp
    OR NEW.level IS DISTINCT FROM OLD.level
    OR NEW.xp_this_week IS DISTINCT FROM OLD.xp_this_week
    OR NEW.total_goals_completed IS DISTINCT FROM OLD.total_goals_completed
    OR NEW.streak IS DISTINCT FROM OLD.streak
    OR NEW.longest_streak IS DISTINCT FROM OLD.longest_streak
    OR NEW.streak_freeze_count IS DISTINCT FROM OLD.streak_freeze_count
    OR NEW.streak_freeze_pending_count IS DISTINCT FROM OLD.streak_freeze_pending_count
  ) THEN
    RAISE EXCEPTION 'progress fields are server managed' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_user_progress_fields_trigger ON public.users;
CREATE TRIGGER protect_user_progress_fields_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_user_progress_fields();

REVOKE ALL ON FUNCTION public.protect_user_progress_fields()
FROM PUBLIC,anon,authenticated;
