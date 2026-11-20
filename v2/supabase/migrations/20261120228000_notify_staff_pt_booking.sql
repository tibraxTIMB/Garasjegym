CREATE OR REPLACE FUNCTION public.notify_staff_pt_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_member_name text;
  v_session_title text;
  v_starts_at timestamptz;
  v_created_by uuid;
BEGIN
  IF NEW.status <> 'booked' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT s.title, s.starts_at, s.created_by
  INTO v_session_title, v_starts_at, v_created_by
  FROM public.pt_sessions s
  WHERE s.id = NEW.session_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(BTRIM(p.display_name), ''), 'Medlem')
  INTO v_member_name
  FROM public.profiles p
  WHERE p.id = NEW.member_id;

  INSERT INTO public.notifications (
    recipient_id,
    title,
    body,
    category,
    href,
    priority,
    requires_action,
    dedupe_key
  )
  SELECT
    targets.recipient_id,
    'Ny booking av PT-time',
    v_member_name || ' har bestilt ' ||
      COALESCE(NULLIF(BTRIM(v_session_title), ''), 'PT-time') ||
      ' (' || TO_CHAR(v_starts_at AT TIME ZONE 'Europe/Oslo', 'DD.MM HH24:MI') || ').',
    'pt',
    'pt',
    'normal',
    false,
    'pt-booking-confirmed:' || NEW.id::text
  FROM (
    SELECT p.id AS recipient_id
    FROM public.profiles p
    WHERE p.active = true
      AND p.membership_status = 'approved'
      AND p.role IN ('admin', 'manager')

    UNION

    SELECT p.id AS recipient_id
    FROM public.profiles p
    WHERE p.id = v_created_by
      AND p.active = true
      AND p.membership_status = 'approved'
  ) AS targets
  ON CONFLICT (recipient_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_staff_pt_booking() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_staff_pt_booking() TO postgres, service_role;

DROP TRIGGER IF EXISTS pt_booking_notify_staff ON public.pt_bookings;
CREATE TRIGGER pt_booking_notify_staff
AFTER INSERT OR UPDATE OF status ON public.pt_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_pt_booking();
