-- New PT appointments and bookable slots must be scheduled in the future.
-- Historical/completed rows are not affected by this INSERT-only guard.
CREATE OR REPLACE FUNCTION public.guard_pt_session_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NULLIF(BTRIM(NEW.title), '') IS NULL THEN
    RAISE EXCEPTION 'PT-timen må ha eit namn.';
  END IF;

  IF NEW.status IN ('draft', 'published', 'planned')
     AND (NEW.starts_at IS NULL OR NEW.starts_at <= pg_catalog.now()) THEN
    RAISE EXCEPTION 'Nye PT-timar må leggjast fram i tid.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pt_sessions_guard_insert ON public.pt_sessions;
CREATE TRIGGER pt_sessions_guard_insert
BEFORE INSERT ON public.pt_sessions
FOR EACH ROW
EXECUTE FUNCTION public.guard_pt_session_insert();
