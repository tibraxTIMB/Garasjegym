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
  v_event_token text;
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

  -- A booking row can be reused after cancellation. Include its fresh
  -- transition timestamp so a later rebooking gets a new staff notice.
  v_event_token := TO_CHAR(
    COALESCE(NEW.updated_at, NEW.created_at) AT TIME ZONE 'UTC',
    'YYYYMMDDHH24MISSUS'
  );

  INSERT INTO public.notifications (
    recipient_id, title, body, category, href,
    priority, requires_action, dedupe_key
  )
  SELECT
    targets.recipient_id,
    'Ny booking av PT-time',
    v_member_name || ' har bestilt '
      || COALESCE(NULLIF(BTRIM(v_session_title), ''), 'PT-time')
      || ' (' || TO_CHAR(v_starts_at AT TIME ZONE 'Europe/Oslo', 'DD.MM HH24:MI') || ').',
    'pt',
    'pt',
    'normal',
    false,
    'pt-booking-confirmed:' || NEW.id::text || ':' || v_event_token
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

CREATE OR REPLACE FUNCTION public.book_pt_session(p_session_id uuid)
RETURNS TABLE(status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_session public.pt_sessions%rowtype;
  v_count integer;
  v_status text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Du må vere aktivt innlogga for å bestille PT-time.';
  END IF;

  SELECT s.*
  INTO v_session
  FROM public.pt_sessions s
  WHERE s.id = p_session_id
    AND s.status = 'published'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dette PT-tidspunktet er ikkje lenger tilgjengeleg.';
  END IF;

  IF v_session.starts_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'Påmeldingsfristen for denne timen er ute.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pt_bookings b
    WHERE b.session_id = p_session_id
      AND b.member_id = auth.uid()
      AND b.status IN ('booked', 'waitlist')
  ) THEN
    RAISE EXCEPTION 'Du er allereie registrert på dette tidspunktet.';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM public.pt_bookings b
  WHERE b.session_id = p_session_id
    AND b.status = 'booked';

  v_status := CASE
    WHEN v_count < v_session.capacity THEN 'booked'
    ELSE 'waitlist'
  END;

  INSERT INTO public.pt_bookings(session_id, member_id, status)
  VALUES (p_session_id, auth.uid(), v_status)
  ON CONFLICT (session_id, member_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = pg_catalog.clock_timestamp();

  RETURN QUERY SELECT v_status;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_staff_pt_booking() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_staff_pt_booking() TO postgres, service_role;
REVOKE ALL ON FUNCTION public.book_pt_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_pt_session(uuid) TO authenticated, service_role;
