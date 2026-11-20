CREATE OR REPLACE FUNCTION public.pt_promote_waitlist_after_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_capacity integer;
  v_session_status text;
  v_starts_at timestamptz;
  v_next_booking uuid;
  v_member_id uuid;
  v_promoted_at timestamptz;
  v_event_token text;
BEGIN
  IF OLD.status = 'booked' AND NEW.status = 'cancelled' THEN
    SELECT capacity, status, starts_at
    INTO v_capacity, v_session_status, v_starts_at
    FROM public.pt_sessions
    WHERE id = NEW.session_id
    FOR UPDATE;

    -- Never promote a waitlist member after the PT session has started.
    IF v_session_status = 'published'
       AND v_starts_at > pg_catalog.now()
       AND (
         SELECT count(*)
         FROM public.pt_bookings
         WHERE session_id = NEW.session_id
           AND status = 'booked'
       ) < COALESCE(v_capacity, 0) THEN
      SELECT id, member_id
      INTO v_next_booking, v_member_id
      FROM public.pt_bookings
      WHERE session_id = NEW.session_id
        AND status = 'waitlist'
      ORDER BY created_at ASC, id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED;

      IF v_next_booking IS NOT NULL THEN
        UPDATE public.pt_bookings
        SET status = 'booked',
            updated_at = pg_catalog.clock_timestamp()
        WHERE id = v_next_booking
        RETURNING updated_at INTO v_promoted_at;

        v_event_token := TO_CHAR(
          v_promoted_at AT TIME ZONE 'UTC',
          'YYYYMMDDHH24MISSUS'
        );

        INSERT INTO public.notifications (
          recipient_id, title, body, category, href,
          priority, requires_action, dedupe_key
        )
        VALUES (
          v_member_id,
          'Du har fått plass på PT-timen',
          'Ein plass har blitt ledig. Du er no meldt på PT-timen.',
          'pt',
          'pt-studio',
          'high',
          false,
          'pt-waitlist-promoted:' || v_next_booking::text || ':' || v_event_token
        )
        ON CONFLICT (recipient_id, dedupe_key)
          WHERE dedupe_key IS NOT NULL
          DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
