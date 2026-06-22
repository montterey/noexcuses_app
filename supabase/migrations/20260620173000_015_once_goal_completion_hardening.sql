-- A one-time goal may be completed only once across its entire lifetime.
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
  IF p_date IS NULL THEN
    RAISE EXCEPTION 'date is required' USING ERRCODE='22023';
  END IF;

  PERFORM 1 FROM public.users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE='P0002';
  END IF;

  SELECT * INTO v_goal
  FROM public.goals
  WHERE id=p_goal_id AND user_id=p_user_id
  FOR UPDATE;

  IF NOT FOUND OR NOT COALESCE(v_goal.active,true) OR COALESCE(v_goal.paused,false) THEN
    RAISE EXCEPTION 'goal not found or inactive' USING ERRCODE='P0002';
  END IF;

  v_frequency:=COALESCE(NULLIF(v_goal.frequency,''),NULLIF(v_goal.type,''),'daily');

  IF v_frequency='once' THEN
    SELECT id,status INTO v_existing
    FROM public.goal_logs
    WHERE user_id=p_user_id
      AND goal_id=p_goal_id
      AND status='done'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'applied',false,
        'status',v_existing.status,
        'xp_awarded',0,
        'challenge_updates',0
      );
    END IF;
  END IF;

  SELECT id,status INTO v_existing
  FROM public.goal_logs
  WHERE user_id=p_user_id AND goal_id=p_goal_id AND date=p_date
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'applied',false,
      'status',v_existing.status,
      'xp_awarded',0,
      'challenge_updates',0
    );
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
  ON CONFLICT(idempotency_key)
  DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
  RETURNING id INTO v_event_id;

  v_challenge_updates:=public.apply_activity_event_to_challenges(v_event_id);

  RETURN jsonb_build_object(
    'applied',true,
    'status','done',
    'xp_awarded',v_xp,
    'goal_log_id',v_log_id,
    'challenge_updates',v_challenge_updates
  );
END $$;

REVOKE ALL ON FUNCTION public.complete_goal(uuid,uuid,date)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_goal(uuid,uuid,date) TO service_role;
