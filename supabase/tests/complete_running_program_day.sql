-- Run only against an isolated local/test database after migration 012.
-- The transaction is rolled back so the scenarios leave no data behind.
\set ON_ERROR_STOP on

BEGIN;

INSERT INTO public.users (id, telegram_id, first_name, xp, xp_this_week)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  -120260620,
  'Running RPC test',
  0,
  0
);

-- A clean install must retain the existing client-side path used by fitness,
-- sleep and reading.
SET LOCAL ROLE anon;
INSERT INTO public.user_programs (
  id,
  user_id,
  program_code,
  current_day,
  active,
  completed
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'fitness',
  1,
  true,
  false
);
UPDATE public.user_programs
SET current_day = 2
WHERE id = '20000000-0000-0000-0000-000000000001';
RESET ROLE;

SELECT set_config('request.jwt.claim.role', 'service_role', true);

DO $$
DECLARE
  v_result jsonb;
  v_program_id uuid;
  v_xp integer;
  v_active boolean;
  v_completed boolean;
  v_current_day integer;
BEGIN
  IF (SELECT current_day FROM public.user_programs
      WHERE id = '20000000-0000-0000-0000-000000000001') <> 2 THEN
    RAISE EXCEPTION 'fitness client update failed';
  END IF;

  -- New running: day 1 -> day 2 and +25 XP.
  v_result := public.complete_program_day(
    '10000000-0000-0000-0000-000000000001',
    'running',
    NULL,
    1
  );

  IF v_result <> jsonb_build_object(
    'applied', true,
    'current_day', 2,
    'completed', false,
    'xp_awarded', 25
  ) THEN
    RAISE EXCEPTION 'unexpected day 1 result: %', v_result;
  END IF;

  SELECT id INTO v_program_id
  FROM public.user_programs
  WHERE user_id = '10000000-0000-0000-0000-000000000001'
    AND program_code = 'running';

  -- Repeating day 1 is idempotent and awards no XP.
  v_result := public.complete_program_day(
    '10000000-0000-0000-0000-000000000001',
    'running',
    v_program_id,
    1
  );

  IF (v_result->>'applied')::boolean OR (v_result->>'xp_awarded')::integer <> 0 THEN
    RAISE EXCEPTION 'duplicate day 1 was not idempotent: %', v_result;
  END IF;

  -- Existing day 29 must advance to an active day 30.
  UPDATE public.user_programs
  SET current_day = 29, active = true, completed = false
  WHERE id = v_program_id;

  v_result := public.complete_program_day(
    '10000000-0000-0000-0000-000000000001',
    'running',
    v_program_id,
    29
  );

  SELECT current_day, active, completed
  INTO v_current_day, v_active, v_completed
  FROM public.user_programs
  WHERE id = v_program_id;

  IF v_current_day <> 30 OR NOT v_active OR v_completed
     OR (v_result->>'xp_awarded')::integer <> 25 THEN
    RAISE EXCEPTION 'day 29 did not open day 30: %', v_result;
  END IF;

  -- Day 30 completes at day 30 and awards the final +500 once.
  v_result := public.complete_program_day(
    '10000000-0000-0000-0000-000000000001',
    'running',
    v_program_id,
    30
  );

  SELECT current_day, active, completed
  INTO v_current_day, v_active, v_completed
  FROM public.user_programs
  WHERE id = v_program_id;

  IF v_current_day <> 30 OR v_active OR NOT v_completed
     OR (v_result->>'xp_awarded')::integer <> 500 THEN
    RAISE EXCEPTION 'day 30 did not complete correctly: %', v_result;
  END IF;

  v_result := public.complete_program_day(
    '10000000-0000-0000-0000-000000000001',
    'running',
    v_program_id,
    30
  );

  IF (v_result->>'applied')::boolean OR (v_result->>'xp_awarded')::integer <> 0 THEN
    RAISE EXCEPTION 'duplicate day 30 was not idempotent: %', v_result;
  END IF;

  SELECT xp INTO v_xp
  FROM public.users
  WHERE id = '10000000-0000-0000-0000-000000000001';

  IF v_xp <> 550 THEN
    RAISE EXCEPTION 'unexpected total XP: %', v_xp;
  END IF;
END;
$$;

ROLLBACK;
