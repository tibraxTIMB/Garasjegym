CREATE OR REPLACE FUNCTION public.cancel_pt_booking(p_booking_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_session_id uuid;
  v_session public.pt_sessions%rowtype;
  v_booking public.pt_bookings%rowtype;
  v_member_name text;
  v_event_token text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Du må vere aktivt innlogga for å avbestilla PT-time.';
  END IF;

  -- Resolve the session without locking the booking first. All PT booking
  -- flows lock the session row before the booking row to avoid deadlocks.
  SELECT b.session_id
  INTO v_session_id
  FROM public.pt_bookings b
  WHERE b.id = p_booking_id
    AND b.member_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Du kan berre avbestilla di eiga PT-bestilling.';
  END IF;

  SELECT s.*
  INTO v_session
  FROM public.pt_sessions s
  WHERE s.id = v_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PT-timen finst ikkje lenger.';
  END IF;

  SELECT b.*
  INTO v_booking
  FROM public.pt_bookings b
  WHERE b.id = p_booking_id
    AND b.member_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PT-bestillinga finst ikkje lenger.';
  END IF;

  IF v_booking.status NOT IN ('booked', 'waitlist') THEN
    RAISE EXCEPTION 'Denne PT-bestillinga er ikkje aktiv.';
  END IF;

  IF v_session.status <> 'published' THEN
    RAISE EXCEPTION 'Denne PT-timen er ikkje lenger open for avbestilling.';
  END IF;

  IF v_session.starts_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'PT-timen har starta eller er passert. Kontakt PT direkte ved behov.';
  END IF;

  SELECT COALESCE(NULLIF(BTRIM(p.display_name), ''), 'Medlem')
  INTO v_member_name
  FROM public.profiles p
  WHERE p.id = auth.uid();

  UPDATE public.pt_bookings
  SET status = 'cancelled',
      updated_at = pg_catalog.clock_timestamp()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  v_event_token := TO_CHAR(
    v_booking.updated_at AT TIME ZONE 'UTC',
    'YYYYMMDDHH24MISSUS'
  );

  INSERT INTO public.notifications (
    recipient_id, title, body, category, href,
    priority, requires_action, dedupe_key
  )
  SELECT
    targets.recipient_id,
    'PT-bestilling avbestilt',
    v_member_name || ' har avbestilt PT-timen «'
      || COALESCE(NULLIF(BTRIM(v_session.title), ''), 'PT-time')
      || '» (' || TO_CHAR(v_session.starts_at AT TIME ZONE 'Europe/Oslo', 'DD.MM HH24:MI') || ').',
    'pt',
    'pt',
    'normal',
    false,
    'pt-booking-cancelled:' || p_booking_id::text || ':' || v_event_token
  FROM (
    SELECT p.id AS recipient_id
    FROM public.profiles p
    WHERE p.active = true
      AND p.membership_status = 'approved'
      AND p.role IN ('admin', 'manager')

    UNION

    SELECT p.id AS recipient_id
    FROM public.profiles p
    WHERE p.id = v_session.created_by
      AND p.active = true
      AND p.membership_status = 'approved'
  ) AS targets
  ON CONFLICT (recipient_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL
    DO NOTHING;

  RETURN 'cancelled';
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_pt_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_pt_booking(uuid) TO authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname='supabase_realtime'
         AND schemaname='public'
         AND tablename='pt_bookings'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pt_bookings;
  END IF;
END;
$$;
