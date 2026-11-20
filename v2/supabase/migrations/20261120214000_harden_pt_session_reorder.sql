CREATE OR REPLACE FUNCTION public.reorder_pt_program_sessions(
  p_session_id uuid,
  p_target_session_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
  v_program_id uuid;
  v_first public.pt_program_sessions%rowtype;
  v_second public.pt_program_sessions%rowtype;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() OR NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Berre aktiv PT-administrator kan endra rekkjefølgja.';
  END IF;
  IF p_session_id IS NULL OR p_target_session_id IS NULL OR p_session_id=p_target_session_id THEN
    RAISE EXCEPTION 'Ugyldig øktval for omorganisering.';
  END IF;

  SELECT program_id INTO v_program_id
  FROM public.pt_program_sessions
  WHERE id=p_session_id AND archived_at IS NULL;
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Aktiv PT-økt finst ikkje.';
  END IF;

  -- Parent first: same lock order as archive, restore and week/day move.
  PERFORM 1 FROM public.pt_programs
  WHERE id=v_program_id AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PT-programmet er arkivert eller finst ikkje.';
  END IF;

  -- Lock both child rows in deterministic UUID order.
  PERFORM id FROM public.pt_program_sessions
  WHERE id IN (p_session_id,p_target_session_id)
    AND program_id=v_program_id
    AND archived_at IS NULL
  ORDER BY id
  FOR UPDATE;

  SELECT * INTO v_first FROM public.pt_program_sessions
  WHERE id=p_session_id AND program_id=v_program_id AND archived_at IS NULL;
  SELECT * INTO v_second FROM public.pt_program_sessions
  WHERE id=p_target_session_id AND program_id=v_program_id AND archived_at IS NULL;

  IF v_first.id IS NULL OR v_second.id IS NULL THEN
    RAISE EXCEPTION 'Begge øktene må vere aktive og høyra til same PT-program.';
  END IF;

  UPDATE public.pt_program_sessions SET sequence_no=-1 WHERE id=v_first.id;
  UPDATE public.pt_program_sessions
    SET sequence_no=v_first.sequence_no, week_no=v_first.week_no, day_no=v_first.day_no, updated_at=now()
    WHERE id=v_second.id;
  UPDATE public.pt_program_sessions
    SET sequence_no=v_second.sequence_no, week_no=v_second.week_no, day_no=v_second.day_no, updated_at=now()
    WHERE id=v_first.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reorder_pt_program_sessions(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_pt_program_sessions(uuid,uuid) TO authenticated;
