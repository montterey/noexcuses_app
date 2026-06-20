BEGIN;
SELECT set_config('request.jwt.claim.role','service_role',true);

INSERT INTO public.users(
  id,telegram_id,username,first_name,xp,level,xp_this_week,total_goals_completed,
  streak,longest_streak,streak_freeze_count,streak_freeze_pending_count
) VALUES
('20000000-0000-0000-0000-000000000001',991000001,'score_creator','Creator',0,1,0,0,0,0,0,0),
('20000000-0000-0000-0000-000000000002',991000002,'score_opponent','Opponent',0,1,0,0,0,0,0,0)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.goals(id,user_id,title,type,frequency,active,paused,created_at)
VALUES
('21000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Goal one','daily','daily',true,false,now()-interval '1 day'),
('21000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','Goal two','daily','daily',true,false,now()-interval '1 day');

CREATE TEMP TABLE scoring_test_ids(name text PRIMARY KEY,id uuid NOT NULL) ON COMMIT DROP;

WITH created AS (
  SELECT public.create_challenge(
    '20000000-0000-0000-0000-000000000001',
    'First to two goals',NULL,'goals','public','instant',
    'goals_completed','first_to_target',2,7,NULL,NULL,NULL
  ) result
)
INSERT INTO scoring_test_ids
SELECT 'goals',(result->>'challenge_id')::uuid FROM created;

SELECT public.join_challenge(
  '20000000-0000-0000-0000-000000000002',
  (SELECT id FROM scoring_test_ids WHERE name='goals'),
  NULL
);

DO $$
DECLARE
  cid uuid:=(SELECT id FROM scoring_test_ids WHERE name='goals');
  payload jsonb;
  p integer;
  event_count integer;
BEGIN
  payload:=public.complete_goal(
    '20000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    CURRENT_DATE
  );
  IF NOT (payload->>'applied')::boolean THEN RAISE EXCEPTION 'first goal was not applied'; END IF;

  SELECT progress INTO p FROM public.challenge_participants
  WHERE challenge_id=cid AND user_id='20000000-0000-0000-0000-000000000001';
  IF p<>1 THEN RAISE EXCEPTION 'goal progress expected 1, got %',p; END IF;

  payload:=public.complete_goal(
    '20000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    CURRENT_DATE
  );
  IF (payload->>'applied')::boolean THEN RAISE EXCEPTION 'duplicate goal completion applied'; END IF;

  SELECT count(*) INTO event_count FROM public.activity_events
  WHERE idempotency_key=format(
    'goal:%s:%s:%s',
    '20000000-0000-0000-0000-000000000001',
    '21000000-0000-0000-0000-000000000001',
    CURRENT_DATE
  );
  IF event_count<>1 THEN RAISE EXCEPTION 'duplicate activity event created'; END IF;
END $$;

INSERT INTO public.goals(id,user_id,title,type,frequency,active,paused,created_at)
VALUES(
  '21000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000001',
  'Created after challenge start','daily','daily',true,false,now()+interval '1 second'
);

SELECT public.complete_goal(
  '20000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000003',
  CURRENT_DATE
);

DO $$
DECLARE cid uuid:=(SELECT id FROM scoring_test_ids WHERE name='goals'); p integer;
BEGIN
  SELECT progress INTO p FROM public.challenge_participants
  WHERE challenge_id=cid AND user_id='20000000-0000-0000-0000-000000000001';
  IF p<>1 THEN RAISE EXCEPTION 'post-start goal incorrectly counted'; END IF;
END $$;

SELECT public.complete_goal(
  '20000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000002',
  CURRENT_DATE
);

DO $$
DECLARE cid uuid:=(SELECT id FROM scoring_test_ids WHERE name='goals'); c public.challenges%ROWTYPE; r text;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id=cid;
  IF c.status<>'completed' OR c.winner_user_id<>'20000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'first-to-target challenge did not finalize';
  END IF;
  SELECT result INTO r FROM public.challenge_participants
  WHERE challenge_id=cid AND user_id='20000000-0000-0000-0000-000000000002';
  IF r<>'loser' THEN RAISE EXCEPTION 'opponent result not set'; END IF;
END $$;

WITH created AS (
  SELECT public.create_challenge(
    '20000000-0000-0000-0000-000000000001',
    'Running score',NULL,'running','public','instant',
    'program_days_completed','highest_score',NULL,3,NULL,NULL,NULL
  ) result
)
INSERT INTO scoring_test_ids
SELECT 'running',(result->>'challenge_id')::uuid FROM created;

SELECT public.join_challenge(
  '20000000-0000-0000-0000-000000000002',
  (SELECT id FROM scoring_test_ids WHERE name='running'),
  NULL
);

SELECT public.complete_program_day(
  '20000000-0000-0000-0000-000000000001','running',NULL,1
);
SELECT public.complete_program_day(
  '20000000-0000-0000-0000-000000000001','fitness',NULL,1
);

DO $$
DECLARE cid uuid:=(SELECT id FROM scoring_test_ids WHERE name='running'); p integer;
BEGIN
  SELECT progress INTO p FROM public.challenge_participants
  WHERE challenge_id=cid AND user_id='20000000-0000-0000-0000-000000000001';
  IF p<>1 THEN RAISE EXCEPTION 'program category filter failed, progress %',p; END IF;

  UPDATE public.challenges
  SET starts_at=now()-interval '1 day',
      registration_ends_at=now()-interval '1 day',
      ends_at=now()-interval '1 second'
  WHERE id=cid;
END $$;

SELECT public.refresh_challenge_lifecycle();

DO $$
DECLARE cid uuid:=(SELECT id FROM scoring_test_ids WHERE name='running'); c public.challenges%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id=cid;
  IF c.status<>'completed' OR c.winner_user_id<>'20000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'highest-score challenge did not finalize';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.challenges(
      created_by,title,category,visibility,join_mode,challenge_format,
      metric_type,mode,duration_days,max_participants,status,registration_ends_at
    ) VALUES(
      '20000000-0000-0000-0000-000000000001','Invalid category metric',
      'running','public','instant','duel','goals_completed','highest_score',1,2,'open',now()+interval '1 day'
    );
    RAISE EXCEPTION 'invalid category/metric pair accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.role','anon',true);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.goal_logs(goal_id,user_id,status,date,xp_earned)
    VALUES(
      '21000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001','done',CURRENT_DATE,10
    );
    RAISE EXCEPTION 'anon goal completion write succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.user_programs SET current_day=30;
    RAISE EXCEPTION 'anon program progress update succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.users SET xp=999999
    WHERE id='20000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'anon XP update succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.role','service_role',true);

ROLLBACK;
