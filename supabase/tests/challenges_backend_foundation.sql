-- Run against a disposable Supabase database after migrations 001-013.
BEGIN;
SELECT set_config('request.jwt.claim.role','service_role',true);

INSERT INTO public.users(id,telegram_id,username,first_name)
VALUES
('10000000-0000-0000-0000-000000000001',990000001,'challenge_creator','Creator'),
('10000000-0000-0000-0000-000000000002',990000002,'challenge_opponent','Opponent'),
('10000000-0000-0000-0000-000000000003',990000003,'challenge_requester','Requester'),
('10000000-0000-0000-0000-000000000004',990000004,'challenge_invited','Invited')
ON CONFLICT(id) DO NOTHING;

CREATE TEMP TABLE challenge_test_ids(name text PRIMARY KEY,id uuid NOT NULL,token uuid NOT NULL) ON COMMIT DROP;

WITH r AS (
 SELECT public.create_challenge(
  '10000000-0000-0000-0000-000000000001','Seven day goals duel','Complete more goals','goals','public','instant',
  'goals_completed','highest_score',NULL,7,NULL,NULL,NULL
 ) result
)
INSERT INTO challenge_test_ids SELECT 'public',(result->>'challenge_id')::uuid,(result->>'invite_token')::uuid FROM r;

DO $$
DECLARE cid uuid:=(SELECT id FROM challenge_test_ids WHERE name='public'); payload jsonb; n integer;
BEGIN
 SELECT count(*) INTO n FROM public.challenge_participants WHERE challenge_id=cid AND role='creator' AND status='approved';
 IF n<>1 THEN RAISE EXCEPTION 'creator membership missing'; END IF;
 SELECT count(*) INTO n FROM public.list_public_challenges('goals','Seven day',7,'newest',1,20) WHERE id=cid;
 IF n<>1 THEN RAISE EXCEPTION 'public catalog filtering failed'; END IF;
 BEGIN
  PERFORM public.join_challenge('10000000-0000-0000-0000-000000000001',cid,NULL);
  RAISE EXCEPTION 'self join unexpectedly succeeded';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
 payload:=public.join_challenge('10000000-0000-0000-0000-000000000002',cid,NULL);
 IF payload->>'challenge_status'<>'active' THEN RAISE EXCEPTION 'instant duel did not activate'; END IF;
 BEGIN
  PERFORM public.cancel_challenge('10000000-0000-0000-0000-000000000001',cid);
  RAISE EXCEPTION 'active challenge cancellation unexpectedly succeeded';
 EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;
 END;
END $$;

WITH r AS (
 SELECT public.create_challenge(
  '10000000-0000-0000-0000-000000000001','Approval running duel',NULL,'running','public','approval',
  'program_days_completed','first_to_target',5,3,NULL,NULL,NULL
 ) result
)
INSERT INTO challenge_test_ids SELECT 'approval',(result->>'challenge_id')::uuid,(result->>'invite_token')::uuid FROM r;

DO $$
DECLARE cid uuid:=(SELECT id FROM challenge_test_ids WHERE name='approval'); payload jsonb;
BEGIN
 payload:=public.join_challenge('10000000-0000-0000-0000-000000000003',cid,NULL);
 IF payload->>'participant_status'<>'pending' THEN RAISE EXCEPTION 'approval request not pending'; END IF;
 BEGIN
  PERFORM public.join_challenge('10000000-0000-0000-0000-000000000003',cid,NULL);
  RAISE EXCEPTION 'duplicate join unexpectedly succeeded';
 EXCEPTION WHEN unique_violation THEN NULL;
 END;
 payload:=public.respond_challenge_participation(
  '10000000-0000-0000-0000-000000000001',cid,'10000000-0000-0000-0000-000000000003','approve_request'
 );
 IF payload->>'challenge_status'<>'active' THEN RAISE EXCEPTION 'approved duel did not activate'; END IF;
END $$;

WITH r AS (
 SELECT public.create_challenge(
  '10000000-0000-0000-0000-000000000001','Link reading duel',NULL,'reading','link_only','instant',
  'program_days_completed','highest_score',NULL,1,NULL,NULL,NULL
 ) result
)
INSERT INTO challenge_test_ids SELECT 'link',(result->>'challenge_id')::uuid,(result->>'invite_token')::uuid FROM r;

DO $$
DECLARE cid uuid:=(SELECT id FROM challenge_test_ids WHERE name='link'); tok uuid:=(SELECT token FROM challenge_test_ids WHERE name='link'); n integer;
BEGIN
 SELECT count(*) INTO n FROM public.list_public_challenges(NULL,NULL,NULL,'newest',1,50) WHERE id=cid;
 IF n<>0 THEN RAISE EXCEPTION 'link-only challenge leaked into public catalog'; END IF;
 BEGIN
  PERFORM public.join_challenge('10000000-0000-0000-0000-000000000004',cid,gen_random_uuid());
  RAISE EXCEPTION 'wrong token unexpectedly succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM public.join_challenge('10000000-0000-0000-0000-000000000004',cid,tok);
END $$;

WITH r AS (
 SELECT public.create_challenge(
  '10000000-0000-0000-0000-000000000002','Private sleep invitation',NULL,'sleep','private','invite_only',
  'program_days_completed','highest_score',NULL,3,NULL,NULL,'10000000-0000-0000-0000-000000000004'
 ) result
)
INSERT INTO challenge_test_ids SELECT 'private',(result->>'challenge_id')::uuid,(result->>'invite_token')::uuid FROM r;

DO $$
DECLARE cid uuid:=(SELECT id FROM challenge_test_ids WHERE name='private'); payload jsonb;
BEGIN
 payload:=public.respond_challenge_participation(
  '10000000-0000-0000-0000-000000000004',cid,'10000000-0000-0000-0000-000000000004','accept_invite'
 );
 IF payload->>'challenge_status'<>'active' THEN RAISE EXCEPTION 'private invitation did not activate'; END IF;
 IF NOT public.report_challenge('10000000-0000-0000-0000-000000000003',cid,'spam','test') THEN
  RAISE EXCEPTION 'first report not created';
 END IF;
 IF public.report_challenge('10000000-0000-0000-0000-000000000003',cid,'spam','duplicate') THEN
  RAISE EXCEPTION 'duplicate open report created';
 END IF;
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
 BEGIN
  UPDATE public.challenge_participants SET progress=999;
  RAISE EXCEPTION 'anon progress update succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  UPDATE public.challenges SET winner_user_id=created_by;
  RAISE EXCEPTION 'anon winner update succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
  PERFORM 1 FROM public.challenge_reports;
  RAISE EXCEPTION 'anon report read succeeded';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
SELECT * FROM public.list_public_challenges('goals',NULL,7,'popular',1,10);
RESET ROLE;
ROLLBACK;
