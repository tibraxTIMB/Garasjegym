CREATE OR REPLACE FUNCTION public.pt_guard_member_program_session_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'app_private'
AS $function$
DECLARE
  v_client_id uuid;
BEGIN
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.program_id IS DISTINCT FROM OLD.program_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'PT-øktas identitet og programtilhøyrsle kan ikkje endrast.';
  END IF;

  SELECT p.client_id INTO v_client_id
  FROM public.pt_programs p
  WHERE p.id=OLD.program_id;

  IF app_private.is_pt_coach_for_member(v_client_id) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.workout_log_id IS DISTINCT FROM OLD.workout_log_id
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'PT kan ikkje fullføra økta på vegner av medlemmet.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.sequence_no IS DISTINCT FROM OLD.sequence_no
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.wod_id IS DISTINCT FROM OLD.wod_id
    OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
    OR NEW.workout_snapshot IS DISTINCT FROM OLD.workout_snapshot
    OR NEW.coach_note IS DISTINCT FROM OLD.coach_note
    OR NEW.week_no IS DISTINCT FROM OLD.week_no
    OR NEW.day_no IS DISTINCT FROM OLD.day_no
    OR NEW.session_kind IS DISTINCT FROM OLD.session_kind
    OR NEW.focus_area IS DISTINCT FROM OLD.focus_area
    OR NEW.estimated_minutes IS DISTINCT FROM OLD.estimated_minutes
    OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
    OR NEW.archived_by IS DISTINCT FROM OLD.archived_by THEN
    RAISE EXCEPTION 'Medlem kan berre oppdatera status og eiga treningslogg på PT-økta.';
  END IF;

  IF OLD.status NOT IN ('planned','in_progress')
     OR NEW.status NOT IN ('in_progress','completed') THEN
    RAISE EXCEPTION 'Ugyldig statusendring for PT-økta.';
  END IF;

  IF NEW.workout_log_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workout_logs wl
    WHERE wl.id=NEW.workout_log_id
      AND wl.member_id=(SELECT auth.uid())
      AND wl.source_wod_id IS NOT DISTINCT FROM OLD.wod_id
  ) THEN
    RAISE EXCEPTION 'PT-økta kan berre koplast til di eiga treningsøkt for rett WOD.';
  END IF;

  -- A progression step is a coaching milestone, not necessarily a workout.
  -- All actual training sessions must still link to a saved workout log.
  IF NEW.status='completed'
     AND NEW.workout_log_id IS NULL
     AND OLD.session_kind IS DISTINCT FROM 'progression_step' THEN
    RAISE EXCEPTION 'PT-økta kan berre fullførast saman med ei lagra treningsøkt.';
  END IF;

  IF NEW.workout_log_id IS DISTINCT FROM OLD.workout_log_id AND NEW.status<>'completed' THEN
    RAISE EXCEPTION 'Treningslogg kan berre koplast til ei fullført PT-økt.';
  END IF;

  IF NEW.status='completed' THEN
    NEW.completed_at:=coalesce(OLD.completed_at,now());
  ELSE
    NEW.completed_at:=NULL;
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$function$;