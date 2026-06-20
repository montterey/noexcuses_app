-- Atomic, idempotent completion for the running program.
-- The live application uses user_programs, while the original repository
-- migrations only created the legacy programs table. Keep clean installs usable
-- without replacing or rewriting an existing live user_programs table.
DO $$
BEGIN
  IF to_regclass('public.user_programs') IS NULL THEN
    CREATE TABLE public.user_programs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      program_code text NOT NULL,
      current_day integer NOT NULL DEFAULT 1,
      active boolean NOT NULL DEFAULT true,
      completed boolean NOT NULL DEFAULT false,
      start_date date NOT NULL DEFAULT CURRENT_DATE,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, program_code)
    );

    -- The existing application manages non-running programs from the client.
    -- Only grant these privileges when this migration creates the table; never
    -- alter RLS or policies on an existing live user_programs table.
    GRANT SELECT, INSERT, UPDATE, DELETE
      ON TABLE public.user_programs
      TO anon, authenticated;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.program_day_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_program_id uuid NOT NULL REFERENCES public.user_programs(id) ON DELETE CASCADE,
  program_code text NOT NULL,
  day_number integer NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  xp_earned integer NOT NULL CHECK (xp_earned >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, program_code, day_number)
);

ALTER TABLE public.program_day_completions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.program_day_completions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.program_day_completions TO service_role;

CREATE OR REPLACE FUNCTION public.complete_program_day(
  p_user_id uuid,
  p_program_code text,
  p_program_id uuid,
  p_expected_day integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_program public.user_programs%ROWTYPE;
  v_inserted_id uuid;
  v_next_day integer;
  v_completed boolean;
  v_xp integer;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'service_role required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user id is required' USING ERRCODE = '22023';
  END IF;

  IF p_program_code IS DISTINCT FROM 'running' THEN
    RAISE EXCEPTION 'unsupported program code' USING ERRCODE = '22023';
  END IF;

  IF p_expected_day IS NULL OR p_expected_day < 1 OR p_expected_day > 30 THEN
    RAISE EXCEPTION 'expected day must be between 1 and 30' USING ERRCODE = '22023';
  END IF;

  -- Serializes both first-day creation and subsequent completions for this user.
  PERFORM 1
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_program_id IS NOT NULL THEN
    SELECT *
    INTO v_program
    FROM public.user_programs
    WHERE id = p_program_id
      AND user_id = p_user_id
      AND program_code = p_program_code
    FOR UPDATE;
  ELSE
    SELECT *
    INTO v_program
    FROM public.user_programs
    WHERE user_id = p_user_id
      AND program_code = p_program_code
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_program.id IS NULL THEN
    IF p_program_id IS NOT NULL OR p_expected_day <> 1 THEN
      RAISE EXCEPTION 'program not found' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO public.user_programs (
      user_id,
      program_code,
      current_day,
      active,
      completed,
      start_date
    )
    VALUES (
      p_user_id,
      p_program_code,
      2,
      true,
      false,
      CURRENT_DATE
    )
    RETURNING * INTO v_program;
  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.program_day_completions
      WHERE user_id = p_user_id
        AND program_code = p_program_code
        AND day_number = p_expected_day
    ) THEN
      RETURN jsonb_build_object(
        'applied', false,
        'current_day', v_program.current_day,
        'completed', v_program.completed,
        'xp_awarded', 0
      );
    END IF;

    IF v_program.completed OR NOT v_program.active THEN
      RAISE EXCEPTION 'program is not active' USING ERRCODE = '55000';
    END IF;

    IF v_program.current_day <> p_expected_day THEN
      RAISE EXCEPTION 'program day changed; expected %, actual %',
        p_expected_day, v_program.current_day
        USING ERRCODE = '40001';
    END IF;
  END IF;

  v_completed := p_expected_day = 30;
  v_next_day := CASE WHEN v_completed THEN 30 ELSE p_expected_day + 1 END;
  v_xp := CASE WHEN v_completed THEN 500 ELSE 25 END;

  INSERT INTO public.program_day_completions (
    user_id,
    user_program_id,
    program_code,
    day_number,
    xp_earned
  )
  VALUES (
    p_user_id,
    v_program.id,
    p_program_code,
    p_expected_day,
    v_xp
  )
  ON CONFLICT (user_id, program_code, day_number) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN jsonb_build_object(
      'applied', false,
      'current_day', v_program.current_day,
      'completed', v_program.completed,
      'xp_awarded', 0
    );
  END IF;

  UPDATE public.user_programs
  SET current_day = v_next_day,
      active = NOT v_completed,
      completed = v_completed
  WHERE id = v_program.id
  RETURNING * INTO v_program;

  UPDATE public.users
  SET xp = COALESCE(xp, 0) + v_xp,
      xp_this_week = COALESCE(xp_this_week, 0) + v_xp
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found while awarding XP' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'applied', true,
    'current_day', v_program.current_day,
    'completed', v_program.completed,
    'xp_awarded', v_xp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_program_day(uuid, text, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_program_day(uuid, text, uuid, integer)
  TO service_role;
