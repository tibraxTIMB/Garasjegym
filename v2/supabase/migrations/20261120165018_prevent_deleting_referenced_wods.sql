CREATE OR REPLACE FUNCTION public.prevent_deleting_referenced_wod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.pt_wod_assignments a WHERE a.wod_id = OLD.id
  ) OR EXISTS (
    SELECT 1 FROM public.pt_program_sessions ps WHERE ps.wod_id = OLD.id
  ) OR EXISTS (
    SELECT 1 FROM public.workout_logs wl WHERE wl.source_wod_id = OLD.id
  ) OR EXISTS (
    SELECT 1 FROM public.daily_wod d WHERE d.wod_id = OLD.id
  ) OR EXISTS (
    SELECT 1 FROM public.wod_daily_schedules d WHERE d.wod_id = OLD.id
  ) OR EXISTS (
    SELECT 1 FROM public.class_session_wod_completions c WHERE c.wod_id = OLD.id
  ) OR EXISTS (
    SELECT 1 FROM public.training_session_wods sw WHERE sw.wod_id = OLD.id
  ) OR EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.wod_ids @> pg_catalog.jsonb_build_array(OLD.id::text)
  ) OR EXISTS (
    SELECT 1 FROM public.class_live_sessions s
    WHERE s.wod_id = OLD.id
       OR s.wod_ids @> pg_catalog.jsonb_build_array(OLD.id::text)
  ) OR EXISTS (
    SELECT 1 FROM public.pt_sessions s WHERE OLD.id = ANY(s.wod_ids)
  ) THEN
    RAISE EXCEPTION
      'WOD-en har tildelingar eller treningshistorikk. Arkiver WOD-en i staden for å sletta han.';
  END IF;

  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_deleting_referenced_wod() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_deleting_referenced_wod() TO postgres, service_role;

DROP TRIGGER IF EXISTS wods_prevent_deleting_referenced_history ON public.wods;
CREATE TRIGGER wods_prevent_deleting_referenced_history
BEFORE DELETE ON public.wods
FOR EACH ROW
EXECUTE FUNCTION public.prevent_deleting_referenced_wod();
