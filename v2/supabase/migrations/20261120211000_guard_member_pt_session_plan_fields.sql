CREATE OR REPLACE FUNCTION public.guard_pt_program_session_member_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public'
AS $function$
BEGIN
  IF NOT public.is_admin_or_manager() AND (
    NEW.program_id IS DISTINCT FROM OLD.program_id OR
    NEW.sequence_no IS DISTINCT FROM OLD.sequence_no OR
    NEW.title IS DISTINCT FROM OLD.title OR
    NEW.wod_id IS DISTINCT FROM OLD.wod_id OR
    NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date OR
    NEW.workout_snapshot IS DISTINCT FROM OLD.workout_snapshot OR
    NEW.coach_note IS DISTINCT FROM OLD.coach_note OR
    NEW.week_no IS DISTINCT FROM OLD.week_no OR
    NEW.day_no IS DISTINCT FROM OLD.day_no OR
    NEW.session_kind IS DISTINCT FROM OLD.session_kind OR
    NEW.focus_area IS DISTINCT FROM OLD.focus_area OR
    NEW.estimated_minutes IS DISTINCT FROM OLD.estimated_minutes OR
    NEW.archived_at IS DISTINCT FROM OLD.archived_at OR
    NEW.archived_by IS DISTINCT FROM OLD.archived_by
  ) THEN
    RAISE EXCEPTION 'Medlem kan berre oppdatere gjennomføringsstatus på eigne PT-økter.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pt_program_session_member_update_guard ON public.pt_program_sessions;
CREATE TRIGGER pt_program_session_member_update_guard
BEFORE UPDATE ON public.pt_program_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_pt_program_session_member_update();
