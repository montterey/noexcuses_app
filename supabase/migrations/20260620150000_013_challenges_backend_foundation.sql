-- Challenges MVP backend foundation. Scoring is intentionally deferred until PR 2.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 1000),
  category text NOT NULL CHECK (category IN ('fitness','running','sleep','reading','goals','programs')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','link_only','private')),
  join_mode text NOT NULL DEFAULT 'instant' CHECK (join_mode IN ('instant','approval','invite_only')),
  challenge_format text NOT NULL DEFAULT 'duel' CHECK (challenge_format IN ('duel','group','cooperative')),
  metric_type text NOT NULL CHECK (metric_type IN ('goals_completed','program_days_completed')),
  mode text NOT NULL DEFAULT 'highest_score' CHECK (mode IN ('highest_score','first_to_target')),
  target_value integer CHECK ((mode='highest_score' AND target_value IS NULL) OR (mode='first_to_target' AND target_value > 0)),
  duration_days integer NOT NULL CHECK (duration_days IN (1,3,7)),
  max_participants integer NOT NULL DEFAULT 2 CHECK (max_participants BETWEEN 2 AND 100),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','full','active','completed','cancelled','expired')),
  invite_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  starts_at timestamptz,
  ends_at timestamptz,
  registration_ends_at timestamptz,
  winner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (challenge_format <> 'duel' OR max_participants = 2),
  CHECK (ends_at IS NULL OR (starts_at IS NOT NULL AND ends_at > starts_at)),
  CHECK (registration_ends_at IS NULL OR starts_at IS NULL OR registration_ends_at <= starts_at),
  CHECK (winner_user_id IS NULL OR status = 'completed')
);

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('creator','opponent','member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('invited','pending','approved','active','rejected','declined','left','completed')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0),
  rank integer CHECK (rank IS NULL OR rank > 0),
  result text NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','winner','loser','draw')),
  joined_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id,user_id)
);

CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('goal_completed','program_day_completed')),
  source_table text NOT NULL,
  source_id text NOT NULL,
  value integer NOT NULL DEFAULT 1 CHECK (value > 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.challenge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_event_id uuid REFERENCES public.activity_events(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('goal_completed','program_day_completed')),
  source_id text NOT NULL,
  value integer NOT NULL DEFAULT 1 CHECK (value > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id,user_id,event_type,source_id)
);

CREATE TABLE IF NOT EXISTS public.challenge_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('spam','abuse','misleading','unsafe','other')),
  details text CHECK (details IS NULL OR char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','dismissed','actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS challenge_creator_once_idx ON public.challenge_participants(challenge_id) WHERE role='creator';
CREATE UNIQUE INDEX IF NOT EXISTS challenge_report_open_once_idx ON public.challenge_reports(challenge_id,reporter_user_id) WHERE status='open';
CREATE INDEX IF NOT EXISTS challenges_catalog_idx ON public.challenges(category,created_at DESC,id DESC) WHERE visibility='public' AND status='open';
CREATE INDEX IF NOT EXISTS challenges_registration_idx ON public.challenges(registration_ends_at) WHERE status IN ('open','full');
CREATE INDEX IF NOT EXISTS challenge_participants_user_idx ON public.challenge_participants(user_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS challenge_participants_challenge_idx ON public.challenge_participants(challenge_id,status);
CREATE INDEX IF NOT EXISTS activity_events_user_idx ON public.activity_events(user_id,event_type,occurred_at DESC);
CREATE INDEX IF NOT EXISTS challenge_events_user_idx ON public.challenge_events(challenge_id,user_id,created_at DESC);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_reports ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.challenges,public.challenge_participants,public.activity_events,public.challenge_events,public.challenge_reports FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.challenges,public.challenge_participants,public.activity_events,public.challenge_events,public.challenge_reports TO service_role;

CREATE OR REPLACE FUNCTION public.assert_challenge_service_role() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role required' USING ERRCODE='42501';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.challenge_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN NEW.updated_at:=now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS challenges_touch_updated_at ON public.challenges;
CREATE TRIGGER challenges_touch_updated_at BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.challenge_touch_updated_at();
DROP TRIGGER IF EXISTS participants_touch_updated_at ON public.challenge_participants;
CREATE TRIGGER participants_touch_updated_at BEFORE UPDATE ON public.challenge_participants FOR EACH ROW EXECUTE FUNCTION public.challenge_touch_updated_at();

CREATE OR REPLACE FUNCTION public.activate_challenge_if_ready(p_challenge_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v public.challenges%ROWTYPE; n integer; s timestamptz; new_status text;
BEGIN
  PERFORM public.assert_challenge_service_role();
  SELECT * INTO v FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge not found' USING ERRCODE='P0002'; END IF;
  SELECT count(*) INTO n FROM public.challenge_participants WHERE challenge_id=p_challenge_id AND status IN ('approved','active');
  IF n < v.max_participants THEN RETURN v.status; END IF;
  s:=COALESCE(v.starts_at,now());
  new_status:=CASE WHEN s<=now() THEN 'active' ELSE 'full' END;
  UPDATE public.challenges SET status=new_status,starts_at=s,ends_at=s+make_interval(days=>v.duration_days),accepted_at=COALESCE(accepted_at,now()) WHERE id=p_challenge_id;
  IF new_status='active' THEN
    UPDATE public.challenge_participants SET status='active',joined_at=COALESCE(joined_at,now()),approved_at=COALESCE(approved_at,now()) WHERE challenge_id=p_challenge_id AND status='approved';
  END IF;
  RETURN new_status;
END $$;

CREATE OR REPLACE FUNCTION public.create_challenge(
  p_created_by uuid,p_title text,p_description text,p_category text,p_visibility text,p_join_mode text,
  p_metric_type text,p_mode text,p_target_value integer,p_duration_days integer,
  p_starts_at timestamptz DEFAULT NULL,p_registration_ends_at timestamptz DEFAULT NULL,p_invited_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.challenges%ROWTYPE; open_count integer; reg_end timestamptz;
BEGIN
  PERFORM public.assert_challenge_service_role();
  PERFORM 1 FROM public.users WHERE id=p_created_by FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'creator not found' USING ERRCODE='P0002'; END IF;
  SELECT count(*) INTO open_count FROM public.challenges WHERE created_by=p_created_by AND status IN ('open','full');
  IF open_count>=5 THEN RAISE EXCEPTION 'open challenge limit reached' USING ERRCODE='54000'; END IF;
  IF (p_visibility='private' OR p_join_mode='invite_only') AND p_invited_user_id IS NULL THEN
    RAISE EXCEPTION 'invited user required' USING ERRCODE='22023';
  END IF;
  IF p_invited_user_id=p_created_by THEN RAISE EXCEPTION 'creator cannot invite themselves' USING ERRCODE='22023'; END IF;
  IF p_invited_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_invited_user_id) THEN
    RAISE EXCEPTION 'invited user not found' USING ERRCODE='P0002';
  END IF;
  reg_end:=COALESCE(p_registration_ends_at,CASE WHEN p_starts_at IS NULL THEN now()+interval '7 days' ELSE p_starts_at END);
  IF reg_end<=now() OR (p_starts_at IS NOT NULL AND reg_end>p_starts_at) THEN
    RAISE EXCEPTION 'invalid registration deadline' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.challenges(created_by,title,description,category,visibility,join_mode,challenge_format,metric_type,mode,target_value,duration_days,max_participants,starts_at,registration_ends_at)
  VALUES(p_created_by,btrim(p_title),NULLIF(btrim(COALESCE(p_description,'')),''),p_category,p_visibility,p_join_mode,'duel',p_metric_type,p_mode,p_target_value,p_duration_days,2,p_starts_at,reg_end)
  RETURNING * INTO c;
  INSERT INTO public.challenge_participants(challenge_id,user_id,role,status,joined_at,approved_at) VALUES(c.id,p_created_by,'creator','approved',now(),now());
  IF p_invited_user_id IS NOT NULL THEN
    INSERT INTO public.challenge_participants(challenge_id,user_id,role,status) VALUES(c.id,p_invited_user_id,'opponent','invited');
  END IF;
  RETURN jsonb_build_object('challenge_id',c.id,'invite_token',c.invite_token,'status',c.status);
END $$;

CREATE OR REPLACE FUNCTION public.join_challenge(p_user_id uuid,p_challenge_id uuid,p_invite_token uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.challenges%ROWTYPE; reserved integer; pstatus text; cstatus text;
BEGIN
  PERFORM public.assert_challenge_service_role();
  PERFORM 1 FROM public.users WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'user not found' USING ERRCODE='P0002'; END IF;
  SELECT * INTO c FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge not found' USING ERRCODE='P0002'; END IF;
  IF c.status<>'open' THEN RAISE EXCEPTION 'challenge is not open' USING ERRCODE='55000'; END IF;
  IF c.registration_ends_at<=now() THEN UPDATE public.challenges SET status='expired' WHERE id=c.id; RAISE EXCEPTION 'registration expired' USING ERRCODE='55000'; END IF;
  IF c.created_by=p_user_id THEN RAISE EXCEPTION 'creator cannot join own duel' USING ERRCODE='22023'; END IF;
  IF c.visibility='private' OR c.join_mode='invite_only' THEN RAISE EXCEPTION 'invitation required' USING ERRCODE='42501'; END IF;
  IF c.visibility='link_only' AND p_invite_token IS DISTINCT FROM c.invite_token THEN RAISE EXCEPTION 'invalid invite token' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.challenge_participants WHERE challenge_id=c.id AND user_id=p_user_id) THEN RAISE EXCEPTION 'duplicate participant' USING ERRCODE='23505'; END IF;
  SELECT count(*) INTO reserved FROM public.challenge_participants WHERE challenge_id=c.id AND status IN ('invited','approved','active');
  IF reserved>=c.max_participants THEN RAISE EXCEPTION 'challenge is full' USING ERRCODE='55000'; END IF;
  pstatus:=CASE WHEN c.join_mode='approval' THEN 'pending' ELSE 'approved' END;
  INSERT INTO public.challenge_participants(challenge_id,user_id,role,status,joined_at,approved_at)
  VALUES(c.id,p_user_id,'opponent',pstatus,CASE WHEN pstatus='approved' THEN now() END,CASE WHEN pstatus='approved' THEN now() END);
  cstatus:=CASE WHEN pstatus='approved' THEN public.activate_challenge_if_ready(c.id) ELSE c.status END;
  RETURN jsonb_build_object('challenge_id',c.id,'participant_status',pstatus,'challenge_status',cstatus);
END $$;

CREATE OR REPLACE FUNCTION public.respond_challenge_participation(p_actor_user_id uuid,p_challenge_id uuid,p_target_user_id uuid,p_action text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.challenges%ROWTYPE; expected text; cstatus text;
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
  ELSE RAISE EXCEPTION 'unsupported action' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.challenge_participants WHERE challenge_id=c.id AND user_id=p_target_user_id AND status=expected FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found' USING ERRCODE='P0002'; END IF;
  IF p_action IN ('decline_invite','reject_request') THEN
    UPDATE public.challenge_participants SET status=CASE WHEN p_action='decline_invite' THEN 'declined' ELSE 'rejected' END WHERE challenge_id=c.id AND user_id=p_target_user_id;
    RETURN jsonb_build_object('participant_status',CASE WHEN p_action='decline_invite' THEN 'declined' ELSE 'rejected' END,'challenge_status',c.status);
  END IF;
  IF (SELECT count(*) FROM public.challenge_participants WHERE challenge_id=c.id AND user_id<>p_target_user_id AND status IN ('invited','approved','active'))>=c.max_participants THEN
    RAISE EXCEPTION 'challenge is full' USING ERRCODE='55000';
  END IF;
  UPDATE public.challenge_participants SET status='approved',joined_at=COALESCE(joined_at,now()),approved_at=now() WHERE challenge_id=c.id AND user_id=p_target_user_id;
  cstatus:=public.activate_challenge_if_ready(c.id);
  RETURN jsonb_build_object('participant_status','approved','challenge_status',cstatus);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_challenge(p_user_id uuid,p_challenge_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE c public.challenges%ROWTYPE;
BEGIN
  PERFORM public.assert_challenge_service_role();
  SELECT * INTO c FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge not found' USING ERRCODE='P0002'; END IF;
  IF c.created_by IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'creator required' USING ERRCODE='42501'; END IF;
  IF c.status NOT IN ('open','full') THEN RAISE EXCEPTION 'cannot cancel active challenge' USING ERRCODE='55000'; END IF;
  UPDATE public.challenges SET status='cancelled' WHERE id=c.id;
  UPDATE public.challenge_participants SET status='left' WHERE challenge_id=c.id AND status IN ('invited','pending','approved');
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.list_public_challenges(
  p_category text DEFAULT NULL,p_search text DEFAULT NULL,p_duration_days integer DEFAULT NULL,
  p_sort text DEFAULT 'newest',p_page integer DEFAULT 1,p_page_size integer DEFAULT 20
) RETURNS TABLE(
  id uuid,title text,description text,category text,challenge_format text,metric_type text,mode text,target_value integer,
  duration_days integer,max_participants integer,participant_count integer,available_places integer,starts_at timestamptz,
  registration_ends_at timestamptz,creator_username text,creator_first_name text,created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  WITH catalog AS (
    SELECT c.id,c.title,c.description,c.category,c.challenge_format,c.metric_type,c.mode,c.target_value,c.duration_days,c.max_participants,
      count(cp.id) FILTER(WHERE cp.status IN ('invited','approved','active'))::integer participant_count,
      c.starts_at,c.registration_ends_at,u.username::text creator_username,u.first_name::text creator_first_name,c.created_at
    FROM public.challenges c JOIN public.users u ON u.id=c.created_by
    LEFT JOIN public.challenge_participants cp ON cp.challenge_id=c.id
    WHERE c.visibility='public' AND c.status='open' AND (c.registration_ends_at IS NULL OR c.registration_ends_at>now())
      AND (p_category IS NULL OR c.category=p_category) AND (p_duration_days IS NULL OR c.duration_days=p_duration_days)
      AND (p_search IS NULL OR btrim(p_search)='' OR c.title ILIKE '%'||btrim(p_search)||'%' OR COALESCE(u.username,'') ILIKE '%'||btrim(p_search)||'%')
    GROUP BY c.id,u.username,u.first_name
  )
  SELECT x.id,x.title,x.description,x.category,x.challenge_format,x.metric_type,x.mode,x.target_value,x.duration_days,x.max_participants,
    x.participant_count,GREATEST(x.max_participants-x.participant_count,0),x.starts_at,x.registration_ends_at,x.creator_username,x.creator_first_name,x.created_at
  FROM catalog x
  ORDER BY CASE WHEN p_sort='popular' THEN x.participant_count END DESC NULLS LAST,
    CASE WHEN p_sort='starting_soon' THEN COALESCE(x.starts_at,x.created_at) END ASC NULLS LAST,
    CASE WHEN p_sort IN ('newest','recommended') OR p_sort NOT IN ('popular','starting_soon') THEN x.created_at END DESC NULLS LAST,x.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_page_size,20),1),50)
  OFFSET (GREATEST(COALESCE(p_page,1),1)-1)*LEAST(GREATEST(COALESCE(p_page_size,20),1),50)
$$;

CREATE OR REPLACE FUNCTION public.list_user_challenges(p_user_id uuid,p_scope text DEFAULT 'active')
RETURNS TABLE(challenge_id uuid,title text,category text,metric_type text,mode text,challenge_status text,participant_status text,progress integer,result text,starts_at timestamptz,ends_at timestamptz,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.assert_challenge_service_role();
  IF p_scope NOT IN ('invitations','active','history','all') THEN RAISE EXCEPTION 'unsupported scope' USING ERRCODE='22023'; END IF;
  RETURN QUERY SELECT c.id,c.title,c.category,c.metric_type,c.mode,c.status,cp.status,cp.progress,cp.result,c.starts_at,c.ends_at,c.created_at
  FROM public.challenge_participants cp JOIN public.challenges c ON c.id=cp.challenge_id
  WHERE cp.user_id=p_user_id AND (p_scope='all' OR (p_scope='invitations' AND cp.status IN ('invited','pending')) OR
    (p_scope='active' AND c.status IN ('open','full','active') AND cp.status IN ('approved','active')) OR
    (p_scope='history' AND c.status IN ('completed','cancelled','expired')))
  ORDER BY c.created_at DESC,c.id DESC;
END $$;

CREATE OR REPLACE FUNCTION public.report_challenge(p_reporter_user_id uuid,p_challenge_id uuid,p_reason text,p_details text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM public.assert_challenge_service_role();
  IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=p_reporter_user_id) THEN RAISE EXCEPTION 'reporter not found' USING ERRCODE='P0002'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.challenges WHERE id=p_challenge_id) THEN RAISE EXCEPTION 'challenge not found' USING ERRCODE='P0002'; END IF;
  IF EXISTS(SELECT 1 FROM public.challenge_reports WHERE challenge_id=p_challenge_id AND reporter_user_id=p_reporter_user_id AND status='open') THEN RETURN false; END IF;
  INSERT INTO public.challenge_reports(challenge_id,reporter_user_id,reason,details) VALUES(p_challenge_id,p_reporter_user_id,p_reason,NULLIF(btrim(COALESCE(p_details,'')),''));
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.assert_challenge_service_role() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.activate_challenge_if_ready(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_challenge(uuid,text,text,text,text,text,text,text,integer,integer,timestamptz,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.join_challenge(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.respond_challenge_participation(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.cancel_challenge(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.list_user_challenges(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.report_challenge(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_challenge(uuid,text,text,text,text,text,text,text,integer,integer,timestamptz,timestamptz,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.join_challenge(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.respond_challenge_participation(uuid,uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_challenge(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_user_challenges(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.report_challenge(uuid,uuid,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.list_public_challenges(text,text,integer,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_challenges(text,text,integer,text,integer,integer) TO anon,authenticated,service_role;
