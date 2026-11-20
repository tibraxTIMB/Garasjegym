CREATE OR REPLACE FUNCTION public.guard_class_workout_wod_match()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_session public.class_live_sessions%rowtype;
  v_user_id uuid := auth.uid();
BEGIN
  IF NEW.class_live_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_user_id IS NULL OR NEW.member_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Gruppetime-resultat må lagrast av medlemmen som er innlogga.';
  END IF;

  SELECT s.*
  INTO v_session
  FROM public.class_live_sessions s
  WHERE s.id = NEW.class_live_session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fellesøkta finst ikkje.';
  END IF;

  IF v_session.status NOT IN ('active','paused','finished') THEN
    RAISE EXCEPTION 'Fellesøkta er ikkje open for resultatregistrering.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.class_bookings b
    WHERE b.class_id = v_session.class_id
      AND b.member_id = NEW.member_id
      AND b.status = 'confirmed'
  ) THEN
    RAISE EXCEPTION 'Du må ha stadfesta påmelding for å registrera resultat på gruppetimen.';
  END IF;

  IF NEW.source_wod_id IS NULL
     OR NOT (
       v_session.wod_id = NEW.source_wod_id
       OR v_session.wod_ids @> pg_catalog.jsonb_build_array(NEW.source_wod_id::text)
     ) THEN
    RAISE EXCEPTION 'WOD-en høyrer ikkje til denne gruppetimen.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_class_workout_wod_match ON public.workout_logs;
CREATE TRIGGER trg_guard_class_workout_wod_match
BEFORE INSERT ON public.workout_logs
FOR EACH ROW
EXECUTE FUNCTION public.guard_class_workout_wod_match();
