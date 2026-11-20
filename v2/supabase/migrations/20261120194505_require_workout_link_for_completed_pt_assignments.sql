CREATE OR REPLACE FUNCTION public.guard_completed_pt_assignment_workout_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_link_changed boolean := true;
  v_log_member_id uuid;
  v_log_wod_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_link_changed :=
      OLD.status IS DISTINCT FROM NEW.status
      OR OLD.workout_log_id IS DISTINCT FROM NEW.workout_log_id
      OR OLD.member_id IS DISTINCT FROM NEW.member_id
      OR OLD.wod_id IS DISTINCT FROM NEW.wod_id;
  END IF;

  IF NEW.status = 'completed' AND v_link_changed THEN
    IF NEW.workout_log_id IS NULL THEN
      RAISE EXCEPTION 'Ei PT-tildeling kan berre markerast som fullført når ei treningsøkt er lagra.';
    END IF;

    SELECT wl.member_id, wl.source_wod_id
      INTO v_log_member_id, v_log_wod_id
    FROM public.workout_logs wl
    WHERE wl.id = NEW.workout_log_id;

    IF NOT FOUND
       OR v_log_member_id IS DISTINCT FROM NEW.member_id
       OR v_log_wod_id IS DISTINCT FROM NEW.wod_id THEN
      RAISE EXCEPTION 'Treningsøkta må tilhøyra medlemmen og samsvara med WOD-en i PT-tildelinga.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_completed_pt_assignment_workout_link
  ON public.pt_wod_assignments;

CREATE TRIGGER trg_guard_completed_pt_assignment_workout_link
BEFORE INSERT OR UPDATE OF status, workout_log_id, member_id, wod_id
ON public.pt_wod_assignments
FOR EACH ROW
EXECUTE FUNCTION public.guard_completed_pt_assignment_workout_link();

REVOKE ALL ON FUNCTION public.guard_completed_pt_assignment_workout_link() FROM PUBLIC;
