CREATE OR REPLACE FUNCTION public.promote_class_waitlist_after_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_capacity integer;
  v_published boolean;
  v_starts_at timestamptz;
  v_cancelled_at timestamptz;
  v_active_count integer;
  v_next_booking uuid;
  v_member_id uuid;
  v_promoted_at timestamptz;
  v_event_token text;
BEGIN
  IF OLD.status IN ('confirmed', 'pending')
     AND NEW.status = 'cancelled' THEN
    SELECT
      c.capacity,
      c.published,
      c.starts_at,
      c.cancelled_at
    INTO
      v_capacity,
      v_published,
      v_starts_at,
      v_cancelled_at
    FROM public.classes c
    WHERE c.id = NEW.class_id
    FOR UPDATE;

    -- A waitlist place can only be promoted while booking is still open.
    IF COALESCE(v_published, false)
       AND v_cancelled_at IS NULL
       AND v_starts_at > pg_catalog.now() THEN

      SELECT count(*)::integer
      INTO v_active_count
      FROM public.class_bookings b
      WHERE b.class_id = NEW.class_id
        AND b.status IN ('confirmed', 'pending');

      IF v_capacity IS NOT NULL AND v_active_count < v_capacity THEN
        SELECT b.id, b.member_id
        INTO v_next_booking, v_member_id
        FROM public.class_bookings b
        WHERE b.class_id = NEW.class_id
          AND b.status = 'waitlist'
        ORDER BY b.created_at ASC, b.id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;

        IF v_next_booking IS NOT NULL THEN
          UPDATE public.class_bookings
          SET status = 'confirmed',
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
            'Du har fått plass på gruppetimen',
            'Ein plass har blitt ledig. Du er no meldt på gruppetimen.',
            'booking',
            '/timeplan',
            'high',
            false,
            'class-waitlist-promoted:' || v_next_booking::text || ':' || v_event_token
          )
          ON CONFLICT (recipient_id, dedupe_key)
            WHERE dedupe_key IS NOT NULL
            DO NOTHING;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.promote_class_waitlist_after_cancel() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_class_waitlist_after_cancel() TO postgres, service_role;
