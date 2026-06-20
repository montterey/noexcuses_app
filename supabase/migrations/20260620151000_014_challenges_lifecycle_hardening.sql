-- Hardening for challenge engagement limits and scheduled lifecycle transitions.

CREATE OR REPLACE FUNCTION public.challenge_engagement_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
  SELECT count(*)::integer
  FROM public.challenge_participants cp
  JOIN public.challenges c ON c.id=cp.challenge_id
  WHERE cp.user_id=p_user_id
    AND cp.status IN ('approved','active')
    AND c.status IN ('full','active')
$$;

CREATE OR REPLACE FUNCTION public.join_challenge(
  p_user_id uuid,
  p_challenge_id uuid,
  p_invite_token uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  c public.challenges%ROWTYPE;
  reserved integer;
  pstatus text;
  cstatus text;
BEGIN
  PERFORM public.assert_challenge_service_role();
  PERFORM 1 FROM public.users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found' USING ERRCODE='P0002'; END IF;

  SELECT * INTO c FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge not found' USING ERRCODE='P0002'; END IF;
  IF c.status<>'open' THEN RAISE EXCEPTION 'challenge is not open' USING ERRCODE='55000'; END IF;
  IF c.registration_ends_at<=now() THEN
    UPDATE public.challenges SET status='expired' WHERE id=c.id;
    RAISE EXCEPTION 'registration expired' USING ERRCODE='55000';
  END IF;
  IF c.created_by=p_user_id THEN RAISE EXCEPTION 'creator cannot join own duel' USING ERRCODE='22023'; END IF;
  IF c.visibility='private' OR c.join_mode='invite_only' THEN RAISE EXCEPTION 'invitation required' USING ERRCODE='42501'; END IF;
  IF c.visibility='link_only' AND p_invite_token IS DISTINCT FROM c.invite_token THEN RAISE EXCEPTION 'invalid invite token' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.challenge_participants WHERE challenge_id=c.id AND user_id=p_user_id) THEN
    RAISE EXCEPTION 'duplicate participant' USING ERRCODE='23505';
  END IF;

  SELECT count(*) INTO reserved
  FROM public.challenge_participants
  WHERE challenge_id=c.id AND status IN ('invited','approved','active');
  IF reserved>=c.max_participants THEN RAISE EXCEPTION 'challenge is full' USING ERRCODE='55000'; END IF;

  pstatus:=CASE WHEN c.join_mode='approval' THEN 'pending' ELSE 'approved' END;
  IF pstatus='approved' AND (
    public.challenge_engagement_count(p_user_id)>=3
    OR public.challenge_engagement_count(c.created_by)>=3
  ) THEN
    RAISE EXCEPTION 'active challenge limit reached' USING ERRCODE='54000';
  END IF;

  INSERT INTO public.challenge_participants(challenge_id,user_id,role,status,joined_at,approved_at)
  VALUES(
    c.id,
    p_user_id,
    'opponent',
    pstatus,
    CASE WHEN pstatus='approved' THEN now() END,
    CASE WHEN pstatus='approved' THEN now() END
  );

  cstatus:=CASE WHEN pstatus='approved' THEN public.activate_challenge_if_ready(c.id) ELSE c.status END;
  RETURN jsonb_build_object('challenge_id',c.id,'participant_status',pstatus,'challenge_status',cstatus);
END $$;

CREATE OR REPLACE FUNCTION public.respond_challenge_participation(
  p_actor_user_id uuid,
  p_challenge_id uuid,
  p_target_user_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  c public.challenges%ROWTYPE;
  expected text;
  cstatus text;
BEGIN
  PERFORM public.assert_challenge_service_role();
  SELECT * INTO c FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge not found' USING ERRCODE='P0002'; END IF;
  IF c.status NOT IN ('open','full') THEN RAISE EXCEPTION 'responses closed' USING ERRCODE='55000'; END IF;

  IF p_action IN ('accept_invite','decline_invite') THEN
    IF p_actor_user_id IS DISTINCT FROM p_target_user_id THEN RAISE EXCEPTION 'own invitation only' USING ERRCODE='42501'; END IF;
    expected:='invited';
  ELSIF p_action IN ('approve_request','reject_request') THEN
    IF p_actor_user_id IS DISTINCT FROM c.created_by THEN RAISE EXCEPTION 'creator required' USING ERRCODE='42501'; END IF;
    expected:='pending';
  ELSE
    RAISE EXCEPTION 'unsupported action' USING ERRCODE='22023';
  END IF;

  PERFORM 1
  FROM public.challenge_participants
  WHERE challenge_id=c.id AND user_id=p_target_user_id AND status=expected
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found' USING ERRCODE='P0002'; END IF;

  IF p_action IN ('decline_invite','reject_request') THEN
    UPDATE public.challenge_participants
    SET status=CASE WHEN p_action='decline_invite' THEN 'declined' ELSE 'rejected' END
    WHERE challenge_id=c.id AND user_id=p_target_user_id;
    RETURN jsonb_build_object(
      'participant_status',CASE WHEN p_action='decline_invite' THEN 'declined' ELSE 'rejected' END,
      'challenge_status',c.status
    );
  END IF;

  IF (SELECT count(*) FROM public.challenge_participants
      WHERE challenge_id=c.id AND user_id<>p_target_user_id
        AND status IN ('invited','approved','active'))>=c.max_participants THEN
    RAISE EXCEPTION 'challenge is full' USING ERRCODE='55000';
  END IF;
  IF public.challenge_engagement_count(p_target_user_id)>=3
     OR public.challenge_engagement_count(c.created_by)>=3 THEN
    RAISE EXCEPTION 'active challenge limit reached' USING ERRCODE='54000';
  END IF;

  UPDATE public.challenge_participants
  SET status='approved',joined_at=COALESCE(joined_at,now()),approved_at=now()
  WHERE challenge_id=c.id AND user_id=p_target_user_id;

  cstatus:=public.activate_challenge_if_ready(c.id);
  RETURN jsonb_build_object('participant_status','approved','challenge_status',cstatus);
END $$;

CREATE OR REPLACE FUNCTION public.refresh_challenge_lifecycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $$
DECLARE
  cid uuid;
  activated integer:=0;
  expired integer:=0;
BEGIN
  PERFORM public.assert_challenge_service_role();

  UPDATE public.challenges
  SET status='expired'
  WHERE status='open'
    AND registration_ends_at IS NOT NULL
    AND registration_ends_at<=now();
  GET DIAGNOSTICS expired=ROW_COUNT;

  FOR cid IN
    SELECT id
    FROM public.challenges
    WHERE status='full' AND starts_at IS NOT NULL AND starts_at<=now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.challenges SET status='active' WHERE id=cid;
    UPDATE public.challenge_participants
    SET status='active',joined_at=COALESCE(joined_at,now()),approved_at=COALESCE(approved_at,now())
    WHERE challenge_id=cid AND status='approved';
    activated:=activated+1;
  END LOOP;

  RETURN jsonb_build_object('activated',activated,'expired',expired);
END $$;

REVOKE ALL ON FUNCTION public.challenge_engagement_count(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.refresh_challenge_lifecycle() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_challenge_lifecycle() TO service_role;
