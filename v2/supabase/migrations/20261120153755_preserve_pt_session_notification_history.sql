CREATE OR REPLACE FUNCTION public.pt_sessions_prevent_history_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.client_id IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM public.pt_bookings b WHERE b.session_id = OLD.id
     )
     OR EXISTS (
       SELECT 1 FROM public.pt_requests r WHERE r.pt_session_id = OLD.id
     )
     OR OLD.workout_log_id IS NOT NULL
     OR OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION
      'PT-timen har kunde, booking eller historikk. Avlys timen i staden for å sletta han.';
  END IF;
  RETURN OLD;
END;
$function$;
