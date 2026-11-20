ALTER TABLE public.pt_sessions
  ADD COLUMN IF NOT EXISTS cancellation_note text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.pt_sessions_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at := pg_catalog.now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pt_sessions_touch_updated_at ON public.pt_sessions;
CREATE TRIGGER pt_sessions_touch_updated_at
BEFORE UPDATE ON public.pt_sessions
FOR EACH ROW
EXECUTE FUNCTION public.pt_sessions_touch_updated_at();

CREATE OR REPLACE FUNCTION public.notify_members_pt_session_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_cancelled boolean := false;
  v_has_schedule_change boolean := false;
  v_token text;
  v_title text;
  v_body text;
BEGIN
  v_is_cancelled :=
    NEW.status = 'cancelled'
    OR (OLD.status = 'published' AND NEW.status IN ('draft', 'planned'));

  v_has_schedule_change :=
    NEW.starts_at IS DISTINCT FROM OLD.starts_at
    OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
    OR NEW.title IS DISTINCT FROM OLD.title;

  IF NOT v_is_cancelled AND NOT v_has_schedule_change THEN
    RETURN NEW;
  END IF;

  -- An updated token makes each distinct reschedule/cancellation idempotent,
  -- while still allowing a session to be reopened and later cancelled again.
  v_token := to_char(
    pg_catalog.clock_timestamp() AT TIME ZONE 'UTC',
    'YYYYMMDDHH24MISSUS'
  );

  IF v_is_cancelled THEN
    v_title := 'PT-timen er avlyst';
    v_body := 'PT-timen «' || COALESCE(NULLIF(BTRIM(OLD.title), ''), 'Personleg trening')
      || '» den '
      || TO_CHAR(OLD.starts_at AT TIME ZONE 'Europe/Oslo', 'DD.MM.YYYY kl. HH24:MI')
      || ' er avlyst.';
    IF NULLIF(BTRIM(NEW.cancellation_note), '') IS NOT NULL THEN
      v_body := v_body || ' Melding frå PT: ' || BTRIM(NEW.cancellation_note);
    END IF;
  ELSE
    v_title := 'PT-timen er endra';
    v_body := 'PT-timen «' || COALESCE(NULLIF(BTRIM(NEW.title), ''), 'Personleg trening')
      || '» er flytta til '
      || TO_CHAR(NEW.starts_at AT TIME ZONE 'Europe/Oslo', 'DD.MM.YYYY kl. HH24:MI')
      || '. Varigheit: ' || NEW.duration_minutes::text || ' minutt.';
  END IF;

  INSERT INTO public.notifications (
    recipient_id, title, body, category, href, priority,
    requires_ack, dedupe_key
  )
  SELECT
    recipients.recipient_id,
    v_title,
    v_body,
    'pt',
    'pt-studio',
    'high',
    true,
    CASE WHEN v_is_cancelled THEN 'pt-session-cancel:' ELSE 'pt-session-change:' END
      || NEW.id::text || ':' || v_token
  FROM (
    SELECT NEW.client_id AS recipient_id
    WHERE NEW.client_id IS NOT NULL

    UNION

    SELECT b.member_id AS recipient_id
    FROM public.pt_bookings b
    WHERE b.session_id = NEW.id
      AND b.status IN ('booked', 'waitlist')
  ) AS recipients
  ON CONFLICT (recipient_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL
    DO NOTHING;

  IF v_is_cancelled THEN
    -- Keep booking history, notify all participants above, and prevent
    -- promotion of waitlisted members into a session that no longer exists.
    UPDATE public.pt_bookings
    SET status = 'cancelled',
        updated_at = pg_catalog.now()
    WHERE session_id = NEW.id
      AND status IN ('booked', 'waitlist');
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pt_sessions_notify_members_change ON public.pt_sessions;
CREATE TRIGGER pt_sessions_notify_members_change
AFTER UPDATE OF title, starts_at, duration_minutes, status
ON public.pt_sessions
FOR EACH ROW
EXECUTE FUNCTION public.notify_members_pt_session_change();

CREATE OR REPLACE FUNCTION public.pt_sessions_prevent_history_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.pt_bookings b WHERE b.session_id = OLD.id
  ) OR OLD.workout_log_id IS NOT NULL OR OLD.status = 'completed' THEN
    RAISE EXCEPTION
      'PT-timen har booking eller treningshistorikk. Avlys timen i staden for å sletta han.';
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS pt_sessions_prevent_history_delete ON public.pt_sessions;
CREATE TRIGGER pt_sessions_prevent_history_delete
BEFORE DELETE ON public.pt_sessions
FOR EACH ROW
EXECUTE FUNCTION public.pt_sessions_prevent_history_delete();

CREATE OR REPLACE FUNCTION public.pt_promote_waitlist_after_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_capacity integer;
  v_session_status text;
  v_next_booking uuid;
  v_member_id uuid;
BEGIN
  IF OLD.status = 'booked' AND NEW.status = 'cancelled' THEN
    SELECT capacity, status
    INTO v_capacity, v_session_status
    FROM public.pt_sessions
    WHERE id = NEW.session_id
    FOR UPDATE;

    -- A cancelled or unpublished PT session must never promote its waitlist.
    IF v_session_status = 'published'
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
            updated_at = pg_catalog.now()
        WHERE id = v_next_booking;

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
          'pt-waitlist-promoted:' || v_next_booking::text
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

CREATE OR REPLACE FUNCTION public.update_pt_session_details(
  p_session_id uuid,
  p_title text,
  p_starts_at timestamptz,
  p_duration_minutes integer,
  p_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'app_private', 'pg_temp'
AS $function$
DECLARE
  v_session public.pt_sessions%rowtype;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.';
  END IF;

  SELECT * INTO v_session
  FROM public.pt_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PT-timen finst ikkje.';
  END IF;

  IF NOT public.is_admin_or_manager()
     AND (
       v_session.client_id IS NULL
       OR NOT app_private.is_pt_coach_for_member(v_session.client_id)
     ) THEN
    RAISE EXCEPTION 'Berre administrator eller PT som er tildelt kunden kan endra timen.';
  END IF;

  IF v_session.status NOT IN ('planned', 'published') THEN
    RAISE EXCEPTION 'Berre planlagde eller publiserte PT-timar kan endrast.';
  END IF;

  IF v_session.starts_at <= pg_catalog.now() OR p_starts_at IS NULL OR p_starts_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'PT-timen må endrast før starttidspunktet, og nytt tidspunkt må liggja fram i tid.';
  END IF;

  IF NULLIF(BTRIM(p_title), '') IS NULL THEN
    RAISE EXCEPTION 'PT-timen må ha eit namn.';
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes < 5 OR p_duration_minutes > 600 THEN
    RAISE EXCEPTION 'Varigheit må vera mellom 5 og 600 minutt.';
  END IF;

  UPDATE public.pt_sessions
  SET title = BTRIM(p_title),
      starts_at = p_starts_at,
      duration_minutes = p_duration_minutes,
      message = COALESCE(p_message, message),
      updated_at = pg_catalog.now()
  WHERE id = p_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_pt_session(
  p_session_id uuid,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'app_private', 'pg_temp'
AS $function$
DECLARE
  v_session public.pt_sessions%rowtype;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.';
  END IF;

  SELECT * INTO v_session
  FROM public.pt_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PT-timen finst ikkje.';
  END IF;

  IF NOT public.is_admin_or_manager()
     AND (
       v_session.client_id IS NULL
       OR NOT app_private.is_pt_coach_for_member(v_session.client_id)
     ) THEN
    RAISE EXCEPTION 'Berre administrator eller PT som er tildelt kunden kan avlysa timen.';
  END IF;

  IF v_session.status NOT IN ('planned', 'published', 'draft') THEN
    RAISE EXCEPTION 'Denne PT-timen kan ikkje avlysast frå gjeldande status.';
  END IF;

  IF v_session.starts_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'PT-timen har starta eller er passert. Bevar historikken og registrer resultat i staden.';
  END IF;

  UPDATE public.pt_sessions
  SET status = 'cancelled',
      cancellation_note = COALESCE(NULLIF(BTRIM(p_note), ''), ''),
      updated_at = pg_catalog.now()
  WHERE id = p_session_id;
END;
$function$;

DROP POLICY IF EXISTS pt_sessions_read ON public.pt_sessions;
CREATE POLICY pt_sessions_read
ON public.pt_sessions
FOR SELECT
TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR client_id = (SELECT auth.uid())
    OR status = 'published'
    OR (
      client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(client_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.pt_bookings b
      WHERE b.session_id = pt_sessions.id
        AND b.member_id = (SELECT auth.uid())
    )
  )
);

REVOKE ALL ON FUNCTION public.pt_sessions_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_members_pt_session_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pt_sessions_prevent_history_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pt_sessions_touch_updated_at() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.notify_members_pt_session_change() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.pt_sessions_prevent_history_delete() TO postgres, service_role;

REVOKE ALL ON FUNCTION public.update_pt_session_details(uuid, text, timestamptz, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_pt_session(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_pt_session_details(uuid, text, timestamptz, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_pt_session(uuid, text) TO authenticated, service_role;
