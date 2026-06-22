-- Verified activity ledger and automatic challenge scoring.
-- All scored mutations are service-role-only and idempotent.

ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS frequency text;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS paused boolean DEFAULT false;
UPDATE public.goals SET frequency=COALESCE(NULLIF(frequency,''),type,'daily') WHERE frequency IS NULL OR frequency='';

ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenge_category_metric_check;
ALTER TABLE public.challenges
  ADD CONSTRAINT challenge_category_metric_check CHECK (
    (category='goals' AND metric_type='goals_completed')
    OR
    (category IN ('fitness','running','sleep','reading','programs') AND metric_type='program_days_completed')
  ) NOT VALID;
ALTER TABLE public.challenges VALIDATE CONSTRAINT challenge_category_metric_check;

-- Legacy client write locking is enabled after production deployment by migration 016.

CREATE OR REPLACE FUNCTION public.finalize_challenge(
  p_challenge_id uuid,
  p_forced_winner_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_challenge public.challenges%ROWTYPE;
  v_top_progress integer:=0;
  v_top_count integer:=0;
  v_winner_user_id uuid;
BEGIN
  PERFORM public.assert_challenge_service_role();

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id=p_challenge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge not found' USING ERRCODE='P0002';
  END IF;

  IF v_challenge.status='completed' THEN
    RETURN jsonb_build_object('completed',false,'winner_user_id',v_challenge.winner_user_id);
  END IF;

  IF v_challenge.status<>'active' THEN
    RETURN jsonb_build_object('completed',false,'winner_user_id',NULL);
  END IF;

  IF p_forced_winner_user_id IS NOT NULL THEN
    IF NOT EXISTS(
      SELECT 1 FROM public.challenge_participants
      WHERE challenge_id=p_challenge_id AND user_id=p_forced_winner_user_id AND status='active'
    ) THEN
      RAISE EXCEPTION 'winner is not an active participant' USING ERRCODE='22023';
    END IF;
    v_winner_user_id:=p_forced_winner_user_id;
  ELSE
    SELECT progress,count(*)::integer
    INTO v_top_progress,v_top_count
    FROM public.challenge_participants
    WHERE challenge_id=p_challenge_id AND status='active'
    GROUP BY progress
    ORDER BY progress DESC
    LIMIT 1;

    IF v_top_count=1 THEN
      SELECT user_id INTO v_winner_user_id
      FROM public.challenge_participants
      WHERE challenge_id=p_challenge_id AND status='active' AND progress=v_top_progress
      LIMIT 1;
    ELSE
      v_winner_user_id:=NULL;
    END IF;
  END IF;

  WITH ranked AS (
    SELECT id,user_id,progress,dense_rank() OVER(ORDER BY progress DESC)::integer AS calculated_rank
    FROM public.challenge_participants
    WHERE challenge_id=p_challenge_id AND status='active'
  )
  UPDATE public.challenge_participants cp
  SET status='completed',
      rank=ranked.calculated_rank,
      result=CASE
        WHEN v_winner_user_id IS NOT NULL AND cp.user_id=v_winner_user_id THEN 'winner'
        WHEN v_winner_user_id IS NOT NULL THEN 'loser'
        WHEN ranked.calculated_rank=1 THEN 'draw'
        ELSE 'loser'
      END
  FROM ranked
  WHERE cp.id=ranked.id;

  UPDATE public.challenges
  SET status='completed',winner_user_id=v_winner_user_id,completed_at=now()
  WHERE id=p_challenge_id;

  RETURN jsonb_build_object('completed',true,'winner_user_id',v_winner_user_id);
END $$;

CREATE OR REPLACE FUNCTION public.apply_activity_event_to_challenges(p_activity_event_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_event public.activity_events%ROWTYPE;
  v_metric text;
  v_candidate record;
  v_challenge_event_id uuid;
  v_progress integer;
  v_updated integer:=0;
  v_goal_daily_count integer;
  v_goal_created_at timestamptz;
BEGIN
  PERFORM public.assert_challenge_service_role();

  SELECT * INTO v_event
  FROM public.activity_events
  WHERE id=p_activity_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'activity event not found' USING ERRCODE='P0002';
  END IF;

  v_metric:=CASE v_event.event_type
    WHEN 'goal_completed' THEN 'goals_completed'
    WHEN 'program_day_completed' THEN 'program_days_completed'
    ELSE NULL
  END;

  IF v_metric IS NULL THEN RETURN 0; END IF;

  v_goal_created_at:=NULLIF(v_event.metadata->>'goal_created_at','')::timestamptz;

  FOR v_candidate IN
    SELECT c.id,c.mode,c.target_value,c.category
    FROM public.challenges c
    JOIN public.challenge_participants cp
      ON cp.challenge_id=c.id AND cp.user_id=v_event.user_id AND cp.status='active'
    WHERE c.status='active'
      AND c.metric_type=v_metric
      AND c.starts_at IS NOT NULL
      AND c.ends_at IS NOT NULL
      AND v_event.occurred_at>=c.starts_at
      AND v_event.occurred_at<c.ends_at
      AND (
        (v_event.event_type='goal_completed' AND c.category='goals' AND v_goal_created_at IS NOT NULL AND v_goal_created_at<=c.starts_at)
        OR
        (v_event.event_type='program_day_completed' AND (
          c.category='programs' OR c.category=COALESCE(v_event.metadata->>'program_code','')
        ))
      )
    ORDER BY c.id
    FOR UPDATE OF c
  LOOP
    IF v_event.event_type='goal_completed' THEN
      SELECT count(*)::integer INTO v_goal_daily_count
      FROM public.challenge_events ce
      JOIN public.activity_events ae ON ae.id=ce.activity_event_id
      WHERE ce.challenge_id=v_candidate.id
        AND ce.user_id=v_event.user_id
        AND ce.event_type='goal_completed'
        AND (ae.occurred_at AT TIME ZONE 'Europe/Chisinau')::date
          =(v_event.occurred_at AT TIME ZONE 'Europe/Chisinau')::date;

      IF v_goal_daily_count>=10 THEN CONTINUE; END IF;
    END IF;

    v_challenge_event_id:=NULL;
    INSERT INTO public.challenge_events(
      challenge_id,user_id,activity_event_id,event_type,source_id,value
    ) VALUES (
      v_candidate.id,v_event.user_id,v_event.id,v_event.event_type,v_event.source_id,v_event.value
    )
    ON CONFLICT(challenge_id,user_id,event_type,source_id) DO NOTHING
    RETURNING id INTO v_challenge_event_id;

    IF v_challenge_event_id IS NULL THEN CONTINUE; END IF;

    UPDATE public.challenge_participants
    SET progress=progress+v_event.value
    WHERE challenge_id=v_candidate.id AND user_id=v_event.user_id AND status='active'
    RETURNING progress INTO v_progress;

    v_updated:=v_updated+1;

    IF v_candidate.mode='first_to_target'
       AND v_candidate.target_value IS NOT NULL
       AND v_progress>=v_candidate.target_value THEN
      PERFORM public.finalize_challenge(v_candidate.id,v_event.user_id);
    END IF;
  END LOOP;

  RETURN v_updated;
END $$;

CREATE OR REPLACE FUNCTION public.complete_goal(
  p_user_id uuid,
  p_goal_id uuid,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_goal public.goals%ROWTYPE;
  v_existing record;
  v_log_id text;
  v_event_id uuid;
  v_frequency text;
  v_challenge_updates integer:=0;
  v_xp integer:=10;
BEGIN
  PERFORM public.assert_challenge_service_role();
  IF p_date IS NULL THEN RAISE EXCEPTION 'date is required' USING ERRCODE='22023'; END IF;

  PERFORM 1 FROM public.users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found' USING ERRCODE='P0002'; END IF;

  SELECT * INTO v_goal
  FROM public.goals
  WHERE id=p_goal_id AND user_id=p_user_id
  FOR UPDATE;

  IF NOT FOUND OR NOT COALESCE(v_goal.active,true) OR COALESCE(v_goal.paused,false) THEN
    RAISE EXCEPTION 'goal not found or inactive' USING ERRCODE='P0002';
  END IF;

  SELECT id,status INTO v_existing
  FROM public.goal_logs
  WHERE user_id=p_user_id AND goal_id=p_goal_id AND date=p_date
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object('applied',false,'status',v_existing.status,'xp_awarded',0,'challenge_updates',0);
  END IF;

  INSERT INTO public.goal_logs(goal_id,user_id,status,date,xp_earned)
  VALUES(p_goal_id,p_user_id,'done',p_date,v_xp)
  RETURNING id::text INTO v_log_id;

  UPDATE public.users
  SET xp=COALESCE(xp,0)+v_xp,
      level=floor((COALESCE(xp,0)+v_xp)/150.0)::integer+1,
      xp_this_week=COALESCE(xp_this_week,0)+v_xp,
      total_goals_completed=COALESCE(total_goals_completed,0)+1
  WHERE id=p_user_id;

  v_frequency:=COALESCE(NULLIF(v_goal.frequency,''),NULLIF(v_goal.type,''),'daily');
  IF v_frequency='daily' THEN
    PERFORM public.update_user_streak(p_user_id);
  END IF;

  INSERT INTO public.activity_events(
    user_id,event_type,source_table,source_id,value,occurred_at,idempotency_key,metadata
  ) VALUES (
    p_user_id,'goal_completed','goal_logs',v_log_id,1,now(),
    format('goal:%s:%s:%s',p_user_id,p_goal_id,p_date),
    jsonb_build_object(
      'goal_id',p_goal_id,
      'goal_frequency',v_frequency,
      'goal_created_at',v_goal.created_at,
      'event_date',p_date
    )
  )
  ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
  RETURNING id INTO v_event_id;

  v_challenge_updates:=public.apply_activity_event_to_challenges(v_event_id);

  RETURN jsonb_build_object(
    'applied',true,'status','done','xp_awarded',v_xp,
    'goal_log_id',v_log_id,'challenge_updates',v_challenge_updates
  );
END $$;

CREATE OR REPLACE FUNCTION public.skip_goal(
  p_user_id uuid,
  p_goal_id uuid,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_goal public.goals%ROWTYPE;
  v_existing record;
  v_log_id text;
  v_frequency text;
BEGIN
  PERFORM public.assert_challenge_service_role();
  PERFORM 1 FROM public.users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found' USING ERRCODE='P0002'; END IF;

  SELECT * INTO v_goal FROM public.goals
  WHERE id=p_goal_id AND user_id=p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'goal not found' USING ERRCODE='P0002'; END IF;

  v_frequency:=COALESCE(NULLIF(v_goal.frequency,''),NULLIF(v_goal.type,''),'daily');
  IF v_frequency<>'daily' THEN RAISE EXCEPTION 'only daily goals can be skipped' USING ERRCODE='22023'; END IF;

  SELECT id,status INTO v_existing
  FROM public.goal_logs
  WHERE user_id=p_user_id AND goal_id=p_goal_id AND date=p_date
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF FOUND THEN RETURN jsonb_build_object('applied',false,'status',v_existing.status); END IF;

  INSERT INTO public.goal_logs(goal_id,user_id,status,date,xp_earned)
  VALUES(p_goal_id,p_user_id,'skipped',p_date,0)
  RETURNING id::text INTO v_log_id;

  RETURN jsonb_build_object('applied',true,'status','skipped','goal_log_id',v_log_id);
END $$;

CREATE OR REPLACE FUNCTION public.complete_program_day(
  p_user_id uuid,
  p_program_code text,
  p_program_id uuid,
  p_expected_day integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_program public.user_programs%ROWTYPE;
  v_inserted_id uuid;
  v_next_day integer;
  v_completed boolean;
  v_xp integer;
  v_event_id uuid;
  v_challenge_updates integer:=0;
BEGIN
  PERFORM public.assert_challenge_service_role();

  IF p_program_code NOT IN ('fitness','running','sleep','reading') THEN
    RAISE EXCEPTION 'unsupported program code' USING ERRCODE='22023';
  END IF;
  IF p_expected_day IS NULL OR p_expected_day<1 OR p_expected_day>30 THEN
    RAISE EXCEPTION 'expected day must be between 1 and 30' USING ERRCODE='22023';
  END IF;

  PERFORM 1 FROM public.users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found' USING ERRCODE='P0002'; END IF;

  IF p_program_id IS NOT NULL THEN
    SELECT * INTO v_program FROM public.user_programs
    WHERE id=p_program_id AND user_id=p_user_id AND program_code=p_program_code
    FOR UPDATE;
  ELSE
    SELECT * INTO v_program FROM public.user_programs
    WHERE user_id=p_user_id AND program_code=p_program_code
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  END IF;

  IF v_program.id IS NULL THEN
    IF p_program_id IS NOT NULL OR p_expected_day<>1 THEN
      RAISE EXCEPTION 'program not found' USING ERRCODE='P0002';
    END IF;
    INSERT INTO public.user_programs(user_id,program_code,current_day,active,completed,start_date)
    VALUES(p_user_id,p_program_code,2,true,false,CURRENT_DATE)
    RETURNING * INTO v_program;
  ELSE
    IF EXISTS(
      SELECT 1 FROM public.program_day_completions
      WHERE user_id=p_user_id AND program_code=p_program_code AND day_number=p_expected_day
    ) THEN
      RETURN jsonb_build_object(
        'applied',false,'current_day',v_program.current_day,
        'completed',v_program.completed,'xp_awarded',0,'challenge_updates',0
      );
    END IF;
    IF v_program.completed OR NOT v_program.active THEN
      RAISE EXCEPTION 'program is not active' USING ERRCODE='55000';
    END IF;
    IF v_program.current_day<>p_expected_day THEN
      RAISE EXCEPTION 'program day changed; expected %, actual %',p_expected_day,v_program.current_day USING ERRCODE='40001';
    END IF;
  END IF;

  v_completed:=p_expected_day=30;
  v_next_day:=CASE WHEN v_completed THEN 30 ELSE p_expected_day+1 END;
  v_xp:=CASE WHEN v_completed THEN 500 ELSE 25 END;

  INSERT INTO public.program_day_completions(user_id,user_program_id,program_code,day_number,xp_earned)
  VALUES(p_user_id,v_program.id,p_program_code,p_expected_day,v_xp)
  ON CONFLICT(user_id,program_code,day_number) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN jsonb_build_object(
      'applied',false,'current_day',v_program.current_day,
      'completed',v_program.completed,'xp_awarded',0,'challenge_updates',0
    );
  END IF;

  UPDATE public.user_programs
  SET current_day=v_next_day,active=NOT v_completed,completed=v_completed
  WHERE id=v_program.id
  RETURNING * INTO v_program;

  UPDATE public.users
  SET xp=COALESCE(xp,0)+v_xp,
      level=floor((COALESCE(xp,0)+v_xp)/150.0)::integer+1,
      xp_this_week=COALESCE(xp_this_week,0)+v_xp
  WHERE id=p_user_id;

  INSERT INTO public.activity_events(
    user_id,event_type,source_table,source_id,value,occurred_at,idempotency_key,metadata
  ) VALUES (
    p_user_id,'program_day_completed','program_day_completions',v_inserted_id::text,1,now(),
    format('program:%s:%s:%s',p_user_id,p_program_code,p_expected_day),
    jsonb_build_object('program_code',p_program_code,'day_number',p_expected_day,'user_program_id',v_program.id)
  )
  ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
  RETURNING id INTO v_event_id;

  v_challenge_updates:=public.apply_activity_event_to_challenges(v_event_id);

  RETURN jsonb_build_object(
    'applied',true,'current_day',v_program.current_day,
    'completed',v_program.completed,'xp_awarded',v_xp,
    'challenge_updates',v_challenge_updates
  );
END $$;

CREATE OR REPLACE FUNCTION public.refresh_challenge_lifecycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  v_id uuid;
  v_activated integer:=0;
  v_expired integer:=0;
  v_completed integer:=0;
BEGIN
  PERFORM public.assert_challenge_service_role();

  UPDATE public.challenges SET status='expired'
  WHERE status='open' AND registration_ends_at IS NOT NULL AND registration_ends_at<=now();
  GET DIAGNOSTICS v_expired=ROW_COUNT;

  FOR v_id IN
    SELECT id FROM public.challenges
    WHERE status='full' AND starts_at IS NOT NULL AND starts_at<=now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.challenges SET status='active' WHERE id=v_id;
    UPDATE public.challenge_participants
    SET status='active',joined_at=COALESCE(joined_at,now()),approved_at=COALESCE(approved_at,now())
    WHERE challenge_id=v_id AND status='approved';
    v_activated:=v_activated+1;
  END LOOP;

  FOR v_id IN
    SELECT id FROM public.challenges
    WHERE status='active' AND ends_at IS NOT NULL AND ends_at<=now()
    ORDER BY id
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.finalize_challenge(v_id,NULL);
    v_completed:=v_completed+1;
  END LOOP;

  RETURN jsonb_build_object('activated',v_activated,'expired',v_expired,'completed',v_completed);
END $$;

REVOKE ALL ON FUNCTION public.finalize_challenge(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.apply_activity_event_to_challenges(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_goal(uuid,uuid,date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.skip_goal(uuid,uuid,date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.complete_program_day(uuid,text,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_goal(uuid,uuid,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.skip_goal(uuid,uuid,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_program_day(uuid,text,uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_challenge_lifecycle() TO service_role;
