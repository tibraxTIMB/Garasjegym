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

  -- Booking is only available for public, unassigned PT slots.
  -- Client-linked sessions are private appointments, not bookable inventory.
  SELECT s.*
  INTO v_session
  FROM public.pt_sessions s
  WHERE s.id = p_session_id
    AND s.status = 'published'
    AND s.client_id IS NULL
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

DROP POLICY IF EXISTS pt_sessions_read ON public.pt_sessions;
CREATE POLICY pt_sessions_read
ON public.pt_sessions FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR client_id = (SELECT auth.uid())
    OR (client_id IS NULL AND status = 'published')
    OR (
      client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(client_id)
    )
    OR (
      client_id IS NULL
      AND app_private.has_own_pt_session_booking(id)
    )
  )
);
