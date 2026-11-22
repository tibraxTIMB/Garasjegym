-- Light-weight garage owner checklist. Receipts are append-only except for
-- marking an existing equipment concern as resolved.
CREATE TABLE IF NOT EXISTS public.garage_maintenance_schedule (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  started_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.garage_maintenance_schedule (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.garage_maintenance_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL CHECK (period IN ('weekly', 'monthly', 'seasonal')),
  checks jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(checks) = 'object' AND length(checks::text) <= 1600),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 600),
  needs_followup boolean NOT NULL DEFAULT false,
  completed_by uuid NOT NULL,
  completed_name text NOT NULL CHECK (char_length(completed_name) BETWEEN 2 AND 80),
  completed_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text NOT NULL DEFAULT '' CHECK (char_length(resolution_note) <= 600),
  CONSTRAINT garage_maintenance_resolution_consistent CHECK (
    (resolved_at IS NULL AND resolved_by IS NULL AND resolution_note = '') OR
    (needs_followup AND resolved_at IS NOT NULL AND char_length(trim(resolution_note)) >= 2)
  )
);

CREATE INDEX IF NOT EXISTS garage_maintenance_latest_idx
  ON public.garage_maintenance_log (period, completed_at DESC);
CREATE INDEX IF NOT EXISTS garage_maintenance_unresolved_idx
  ON public.garage_maintenance_log (completed_at DESC)
  WHERE needs_followup AND resolved_at IS NULL;

ALTER TABLE public.garage_maintenance_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_maintenance_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.garage_maintenance_schedule, public.garage_maintenance_log FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.garage_maintenance_schedule TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.garage_maintenance_log TO authenticated;

CREATE POLICY garage_maintenance_schedule_admin_read
  ON public.garage_maintenance_schedule FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
CREATE POLICY garage_maintenance_log_admin_read
  ON public.garage_maintenance_log FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
CREATE POLICY garage_maintenance_log_admin_insert
  ON public.garage_maintenance_log FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()) AND completed_by = (SELECT auth.uid())
    AND resolved_at IS NULL AND resolved_by IS NULL AND resolution_note = '');
CREATE POLICY garage_maintenance_log_admin_resolve
  ON public.garage_maintenance_log FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()) AND needs_followup AND resolved_at IS NULL)
  WITH CHECK ((SELECT public.is_admin()) AND needs_followup);

-- Protect the original date, actor, checklist and finding even from accidental
-- updates in the browser; resolving a finding adds information, never rewrites it.
CREATE OR REPLACE FUNCTION public.guard_garage_maintenance_receipt_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF ROW(NEW.id, NEW.period, NEW.checks, NEW.note, NEW.needs_followup,
         NEW.completed_by, NEW.completed_name, NEW.completed_at)
     IS DISTINCT FROM
     ROW(OLD.id, OLD.period, OLD.checks, OLD.note, OLD.needs_followup,
         OLD.completed_by, OLD.completed_name, OLD.completed_at) THEN
    RAISE EXCEPTION 'Ei kvittering kan ikkje endrast etter lagring';
  END IF;
  IF NOT OLD.needs_followup OR OLD.resolved_at IS NOT NULL
     OR NEW.resolved_at IS NULL OR NEW.resolved_by IS DISTINCT FROM auth.uid()
     OR char_length(trim(NEW.resolution_note)) < 2 THEN
    RAISE EXCEPTION 'Berre ei open oppfølging kan kvitterast løyst av admin';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_garage_maintenance_receipt_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_garage_maintenance_receipt_update
  ON public.garage_maintenance_log;
CREATE TRIGGER guard_garage_maintenance_receipt_update
  BEFORE UPDATE ON public.garage_maintenance_log
  FOR EACH ROW EXECUTE FUNCTION public.guard_garage_maintenance_receipt_update();
