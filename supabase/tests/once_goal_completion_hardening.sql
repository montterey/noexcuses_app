BEGIN;
SELECT set_config('request.jwt.claim.role','service_role',true);

INSERT INTO public.users(
  id,telegram_id,username,first_name,xp,level,xp_this_week,total_goals_completed,
  streak,longest_streak,streak_freeze_count,streak_freeze_pending_count
) VALUES (
  '22000000-0000-0000-0000-000000000001',
  992000001,
  'once_goal_user',
  'Once',
  0,1,0,0,0,0,0,0
)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.goals(
  id,user_id,title,type,frequency,active,paused,created_at
) VALUES (
  '23000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  'Complete once',
  'once',
  'once',
  true,
  false,
  now()-interval '1 day'
);

DO $$
DECLARE
  first_result jsonb;
  second_result jsonb;
  done_count integer;
  user_xp integer;
  total_completed integer;
BEGIN
  first_result:=public.complete_goal(
    '22000000-0000-0000-0000-000000000001',
    '23000000-0000-0000-0000-000000000001',
    CURRENT_DATE
  );

  second_result:=public.complete_goal(
    '22000000-0000-0000-0000-000000000001',
    '23000000-0000-0000-0000-000000000001',
    CURRENT_DATE+1
  );

  IF NOT (first_result->>'applied')::boolean THEN
    RAISE EXCEPTION 'first once-goal completion was not applied';
  END IF;

  IF (second_result->>'applied')::boolean THEN
    RAISE EXCEPTION 'once-goal completion was applied twice';
  END IF;

  SELECT count(*)::integer INTO done_count
  FROM public.goal_logs
  WHERE user_id='22000000-0000-0000-0000-000000000001'
    AND goal_id='23000000-0000-0000-0000-000000000001'
    AND status='done';

  IF done_count<>1 THEN
    RAISE EXCEPTION 'expected one done log, got %',done_count;
  END IF;

  SELECT xp,total_goals_completed INTO user_xp,total_completed
  FROM public.users
  WHERE id='22000000-0000-0000-0000-000000000001';

  IF user_xp<>10 OR total_completed<>1 THEN
    RAISE EXCEPTION 'once-goal rewards were duplicated: xp %, total %',user_xp,total_completed;
  END IF;
END $$;

ROLLBACK;
