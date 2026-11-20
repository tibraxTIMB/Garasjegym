CREATE OR REPLACE FUNCTION public.notify_assigned_coach_pt_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_session_title text;
  v_starts_at timestamptz;
  v_member_name text;
  v_event_token text;
  v_title text;
  v_body text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'booked' THEN
      RETURN NEW;
    END IF;
    v_title := 'PT-kunde har bestilt time';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'booked' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_title := 'PT-kunde har fått plass';
    ELSIF NEW.status = 'cancelled'
       AND OLD.status IN ('booked', 'waitlist') THEN
      v_title := 'PT-kunde har avbestilt time';
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  SELECT s.title, s.starts_at
  INTO v_session_title, v_starts_at
  FROM public.pt_sessions s
  WHERE s.id = NEW.session_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(NULLIF(BTRIM(p.display_name), ''), 'Medlem')
  INTO v_member_name
  FROM public.profiles p
  WHERE p.id = NEW.member_id;

  IF NEW.status = 'cancelled' THEN
    v_body := COALESCE(v_member_name, 'Kunden') || ' har avbestilt «'
      || COALESCE(NULLIF(BTRIM(v_session_title), ''), 'PT-time')
      || '» (' || TO_CHAR(v_starts_at AT TIME ZONE 'Europe/Oslo', 'DD.MM HH24:MI') || ').';
  ELSE
    v_body := COALESCE(v_member_name, 'Kunden') || ' er no '
      || CASE WHEN v_title = 'PT-kunde har fått plass' THEN 'flytta opp frå ventelista på ' ELSE 'påmeld på ' END
      || '«' || COALESCE(NULLIF(BTRIM(v_session_title), ''), 'PT-time')
      || '» (' || TO_CHAR(v_starts_at AT TIME ZONE 'Europe/Oslo', 'DD.MM HH24:MI') || ').';
  END IF;

  v_event_token := TO_CHAR(
    COALESCE(NEW.updated_at, NEW.created_at, pg_catalog.clock_timestamp()) AT TIME ZONE 'UTC',
    'YYYYMMDDHH24MISSUS'
  );

  INSERT INTO public.notifications (
    recipient_id, title, body, category, href, priority,
    requires_action, dedupe_key
  )
  SELECT
    a.coach_user_id,
    v_title,
    v_body,
    'pt',
    'pt-client:' || NEW.member_id::text,
    CASE WHEN NEW.status = 'cancelled' THEN 'normal' ELSE 'high' END,
    false,
    CASE
      WHEN NEW.status = 'cancelled' THEN 'pt-coach-booking-cancelled:'
      WHEN v_title = 'PT-kunde har fått plass' THEN 'pt-coach-booking-promoted:'
      ELSE 'pt-coach-booking-confirmed:'
    END || NEW.id::text || ':' || v_event_token
  FROM public.pt_client_assignments a
  JOIN public.pt_coaches c
    ON c.user_id = a.coach_user_id
   AND c.is_active = true
  JOIN public.profiles p
    ON p.id = a.coach_user_id
   AND p.role = 'member'
   AND p.active = true
   AND p.membership_status = 'approved'
  WHERE a.member_id = NEW.member_id
    AND a.status = 'active'
  ON CONFLICT (recipient_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_assigned_coach_pt_booking() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_assigned_coach_pt_booking() TO postgres, service_role;

DROP TRIGGER IF EXISTS pt_booking_notify_assigned_coach ON public.pt_bookings;
CREATE TRIGGER pt_booking_notify_assigned_coach
AFTER INSERT OR UPDATE OF status
ON public.pt_bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_assigned_coach_pt_booking();
