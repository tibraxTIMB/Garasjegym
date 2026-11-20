-- Disposable PostgreSQL 17 fixture for the trigger-only EXECUTE hardening.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;

CREATE TABLE public.trigger_probe (
  id integer PRIMARY KEY,
  updated_at timestamptz NOT NULL
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_probe_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.id <= 0 THEN
    RAISE EXCEPTION 'invalid probe id';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_probe_guard
BEFORE INSERT ON public.trigger_probe
FOR EACH ROW EXECUTE FUNCTION public.guard_probe_insert();

CREATE TRIGGER trigger_probe_touch
BEFORE UPDATE ON public.trigger_probe
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT EXECUTE ON FUNCTION public.set_updated_at() TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_probe_insert() TO PUBLIC, anon, authenticated;
