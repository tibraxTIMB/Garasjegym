CREATE OR REPLACE FUNCTION public.save_workout_with_pt_links(
  p_workout jsonb,
  p_assignment_id uuid DEFAULT NULL,
  p_program_session_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_log_member_id uuid;
  v_log_source_wod_id uuid;
  v_status text;
  v_existing_log_id uuid;
  v_linked_wod_id uuid;
  v_updated_id uuid;
  v_program_id uuid;
  v_program_client_id uuid;
  v_program_archived_at timestamptz;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Aktiv medlemskonto krevst for å lagra trening.';
  END IF;

  IF p_assignment_id IS NOT NULL AND p_program_session_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ei treningsøkt kan berre fullføra éi PT-oppgåve om gongen.';
  END IF;

  v_workout_id := public.save_workout_atomic(p_workout);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'garasjegym:pt-workout-link:' || v_workout_id::text,
      0
    )
  );

  SELECT wl.member_id, wl.source_wod_id
  INTO v_log_member_id, v_log_source_wod_id
  FROM public.workout_logs wl
  WHERE wl.id = v_workout_id
  FOR UPDATE;

  IF NOT FOUND OR v_log_member_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Treningsloggen finst ikkje eller høyrer ikkje til deg.';
  END IF;

  IF v_log_source_wod_id IS DISTINCT FROM NULLIF(p_workout->>'source_wod_id', '')::uuid THEN
    RAISE EXCEPTION 'Lagringsnøkkelen er allereie brukt for ein annan WOD. Start økta på nytt før du lagrar.';
  END IF;

  IF p_assignment_id IS NOT NULL THEN
    SELECT a.status, a.workout_log_id, a.wod_id
    INTO v_status, v_existing_log_id, v_linked_wod_id
    FROM public.pt_wod_assignments a
    WHERE a.id = p_assignment_id
      AND a.member_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PT-tildelinga finst ikkje eller høyrer ikkje til deg.';
    END IF;

    IF v_linked_wod_id IS DISTINCT FROM v_log_source_wod_id THEN
      RAISE EXCEPTION 'Treningsøkta samsvarar ikkje med WOD-en som er tildelt.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.pt_wod_assignments a
      WHERE a.workout_log_id = v_workout_id
        AND a.id <> p_assignment_id
    ) OR EXISTS (
      SELECT 1 FROM public.pt_program_sessions ps
      WHERE ps.workout_log_id = v_workout_id
    ) THEN
      RAISE EXCEPTION 'Treningsloggen er allereie brukt til å fullføra ei anna PT-oppgåve.';
    END IF;

    IF v_status = 'completed' THEN
      IF v_existing_log_id IS DISTINCT FROM v_workout_id THEN
        RAISE EXCEPTION 'PT-tildelinga er allereie fullført med ei anna treningsøkt.';
      END IF;
    ELSIF v_status IN ('assigned', 'in_progress') THEN
      UPDATE public.pt_wod_assignments
      SET status = 'completed',
          completed_at = COALESCE(completed_at, pg_catalog.now()),
          workout_log_id = v_workout_id
      WHERE id = p_assignment_id
        AND member_id = v_user_id
        AND status IN ('assigned', 'in_progress')
      RETURNING id INTO v_updated_id;

      IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'PT-tildelinga kunne ikkje fullførast. Ingen delvis lagring er gjort.';
      END IF;
    ELSE
      RAISE EXCEPTION 'PT-tildelinga har ein status som ikkje kan fullførast.';
    END IF;
  END IF;

  IF p_program_session_id IS NOT NULL THEN
    -- Read the parent program without FOR UPDATE: members have SELECT rights
    -- on their own program, but deliberately cannot update program metadata.
    -- Lock only the member-owned session row that is being completed.
    SELECT ps.program_id
    INTO v_program_id
    FROM public.pt_program_sessions ps
    WHERE ps.id = p_program_session_id
      AND ps.archived_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PT-programøkta finst ikkje, er arkivert eller er ikkje tilgjengeleg.';
    END IF;

    SELECT p.client_id, p.archived_at
    INTO v_program_client_id, v_program_archived_at
    FROM public.pt_programs p
    WHERE p.id = v_program_id
      AND p.status = 'active';

    IF NOT FOUND OR v_program_archived_at IS NOT NULL
       OR v_program_client_id IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'PT-programmet er ikkje aktivt eller høyrer ikkje til deg.';
    END IF;

    SELECT ps.status, ps.workout_log_id, ps.wod_id
    INTO v_status, v_existing_log_id, v_linked_wod_id
    FROM public.pt_program_sessions ps
    WHERE ps.id = p_program_session_id
      AND ps.program_id = v_program_id
      AND ps.archived_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PT-programøkta er ikkje lenger aktiv.';
    END IF;

    IF v_linked_wod_id IS NOT NULL
       AND v_linked_wod_id IS DISTINCT FROM v_log_source_wod_id THEN
      RAISE EXCEPTION 'Treningsøkta samsvarar ikkje med WOD-en i PT-programmet.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.pt_program_sessions ps
      WHERE ps.workout_log_id = v_workout_id
        AND ps.id <> p_program_session_id
    ) OR EXISTS (
      SELECT 1 FROM public.pt_wod_assignments a
      WHERE a.workout_log_id = v_workout_id
    ) THEN
      RAISE EXCEPTION 'Treningsloggen er allereie brukt til å fullføra ei anna PT-oppgåve.';
    END IF;

    IF v_status = 'completed' THEN
      IF v_existing_log_id IS DISTINCT FROM v_workout_id THEN
        RAISE EXCEPTION 'PT-programøkta er allereie fullført med ei anna treningsøkt.';
      END IF;
    ELSIF v_status IN ('planned', 'in_progress') THEN
      UPDATE public.pt_program_sessions
      SET status = 'completed',
          completed_at = COALESCE(completed_at, pg_catalog.now()),
          workout_log_id = v_workout_id
      WHERE id = p_program_session_id
        AND program_id = v_program_id
        AND archived_at IS NULL
        AND status IN ('planned', 'in_progress')
      RETURNING id INTO v_updated_id;

      IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'PT-programøkta kunne ikkje fullførast. Ingen delvis lagring er gjort.';
      END IF;
    ELSE
      RAISE EXCEPTION 'PT-programøkta har ein status som ikkje kan fullførast.';
    END IF;
  END IF;

  RETURN v_workout_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_workout_with_pt_links(jsonb, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_workout_with_pt_links(jsonb, uuid, uuid) TO authenticated, service_role;
