CREATE OR REPLACE FUNCTION public.move_pt_program_session(
  p_session_id uuid,
  p_week_no integer,
  p_day_no integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
  v_program_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() OR NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Berre aktiv PT-administrator kan flytta programøkter.';
  END IF;
  IF p_session_id IS NULL OR p_week_no IS NULL OR p_week_no < 1 OR p_week_no > 52
     OR p_day_no IS NULL OR p_day_no < 1 OR p_day_no > 7 THEN
    RAISE EXCEPTION 'Ugyldig veke eller dag. Veke må vere 1–52 og dag 1–7.';
  END IF;

  SELECT program_id INTO v_program_id
  FROM public.pt_program_sessions
  WHERE id=p_session_id AND archived_at IS NULL;
  IF v_program_id IS NULL THEN
    RAISE EXCEPTION 'Aktiv PT-økt vart ikkje funnen.';
  END IF;

  -- Always lock the parent first, matching archive/restore lock order.
  PERFORM 1 FROM public.pt_programs
  WHERE id=v_program_id AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PT-programmet er arkivert eller finst ikkje.';
  END IF;

  PERFORM 1 FROM public.pt_program_sessions
  WHERE id=p_session_id AND program_id=v_program_id AND archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PT-økta vart endra eller arkivert. Last sida på nytt.';
  END IF;

  UPDATE public.pt_program_sessions
  SET week_no=p_week_no, day_no=p_day_no, updated_at=now()
  WHERE id=p_session_id AND program_id=v_program_id AND archived_at IS NULL;
END;
$function$;
