CREATE OR REPLACE FUNCTION public.guard_notification_recipient_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  -- The authenticated recipient may manage only personal read/action state.
  -- Trusted SECURITY DEFINER triggers and service-role jobs retain their
  -- ability to archive related notifications.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL
     OR NEW.recipient_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Du kan berre endra dine eigne varslingar.';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.category IS DISTINCT FROM OLD.category
     OR NEW.href IS DISTINCT FROM OLD.href
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.requires_ack IS DISTINCT FROM OLD.requires_ack
     OR NEW.requires_action IS DISTINCT FROM OLD.requires_action
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at THEN
    RAISE EXCEPTION 'Innhald og mottakar på eit varsel kan ikkje endrast.';
  END IF;

  IF OLD.is_read AND NOT NEW.is_read THEN
    RAISE EXCEPTION 'Eit lese varsel kan ikkje markerast som ulest igjen.';
  END IF;

  IF NEW.is_read AND NOT OLD.is_read THEN
    NEW.read_at := COALESCE(OLD.read_at, pg_catalog.now());
  ELSE
    NEW.read_at := OLD.read_at;
  END IF;

  IF OLD.acknowledged_at IS NOT NULL
     AND NEW.acknowledged_at IS NULL THEN
    RAISE EXCEPTION 'Ei kvittering kan ikkje trekkjast tilbake.';
  END IF;

  IF OLD.acknowledged_at IS NULL
     AND NEW.acknowledged_at IS NOT NULL THEN
    IF NOT NEW.requires_ack THEN
      RAISE EXCEPTION 'Dette varselet krev ikkje kvittering.';
    END IF;
    NEW.acknowledged_at := pg_catalog.now();
    NEW.is_read := true;
    NEW.read_at := COALESCE(OLD.read_at, pg_catalog.now());
  ELSE
    NEW.acknowledged_at := OLD.acknowledged_at;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'open'
       OR NEW.status NOT IN ('resolved', 'dismissed') THEN
      RAISE EXCEPTION 'Status på eit avslutta varsel kan ikkje endrast.';
    END IF;
    IF NEW.status = 'resolved' AND NOT OLD.requires_action THEN
      RAISE EXCEPTION 'Berre varsel som krev handling kan markerast som løyste.';
    END IF;
    IF NEW.status = 'dismissed' AND OLD.requires_action THEN
      RAISE EXCEPTION 'Varsel som krev handling må løysast, ikkje skjulast.';
    END IF;
    NEW.resolved_at := pg_catalog.now();
  ELSE
    NEW.resolved_at := OLD.resolved_at;
  END IF;

  IF OLD.archived_at IS NOT NULL
     AND NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    RAISE EXCEPTION 'Arkiverte varsel kan ikkje gjenopprettast her.';
  END IF;

  IF OLD.archived_at IS NULL
     AND NEW.archived_at IS NOT NULL
     AND NEW.status <> 'dismissed' THEN
    RAISE EXCEPTION 'Eit varsel må avvisast før det kan arkiverast.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_notification_recipient_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_notification_recipient_update() TO postgres, service_role;

DROP TRIGGER IF EXISTS notifications_guard_recipient_update ON public.notifications;
CREATE TRIGGER notifications_guard_recipient_update
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.guard_notification_recipient_update();

DROP POLICY IF EXISTS notifications_read_own ON public.notifications;
CREATE POLICY notifications_read_own
ON public.notifications FOR SELECT TO authenticated
USING (public.is_active_user() AND recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
ON public.notifications FOR UPDATE TO authenticated
USING (public.is_active_user() AND recipient_id = (SELECT auth.uid()))
WITH CHECK (public.is_active_user() AND recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own
ON public.notifications FOR DELETE TO authenticated
USING (public.is_active_user() AND recipient_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_staff_insert ON public.notifications;
CREATE POLICY notifications_staff_insert
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_admin_or_manager());
