CREATE OR REPLACE FUNCTION public.notify_staff_new_pt_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_member_name text;
BEGIN
  SELECT COALESCE(NULLIF(BTRIM(display_name), ''), 'Medlem')
  INTO v_member_name
  FROM public.profiles
  WHERE id = NEW.member_id;

  INSERT INTO public.notifications (
    recipient_id, title, body, category, href,
    priority, requires_action, dedupe_key
  )
  SELECT
    targets.recipient_id,
    'Ny PT-førespurnad',
    v_member_name || ' har bede om PT-time. Opna førespurnaden og følg opp.',
    'pt',
    'pt-request:' || NEW.id::text,
    'high',
    true,
    'pt-request:' || NEW.id::text
  FROM (
    SELECT p.id AS recipient_id
    FROM public.profiles p
    WHERE p.role IN ('admin', 'manager')
      AND p.active = true
      AND p.membership_status = 'approved'

    UNION

    SELECT a.coach_user_id AS recipient_id
    FROM public.pt_client_assignments a
    JOIN public.pt_coaches c
      ON c.user_id = a.coach_user_id
     AND c.is_active = true
    JOIN public.profiles p
      ON p.id = a.coach_user_id
    WHERE a.member_id = NEW.member_id
      AND a.status = 'active'
      AND p.active = true
      AND p.membership_status = 'approved'
  ) AS targets
  ON CONFLICT (recipient_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_staff_pt_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_member_name text;
BEGIN
  IF NEW.status = 'submitted'
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COALESCE(NULLIF(BTRIM(display_name), ''), 'Medlem')
    INTO v_member_name
    FROM public.profiles
    WHERE id = NEW.member_id;

    INSERT INTO public.notifications (
      recipient_id, title, body, category, href,
      priority, requires_action, dedupe_key
    )
    SELECT
      targets.recipient_id,
      'PT-status mottatt',
      v_member_name || ' har svart på «' || COALESCE(NEW.title, 'statusoppfølging')
        || '». Gå gjennom svara i PT-studioet.',
      'pt',
      'pt-checkin:' || NEW.member_id::text,
      'high',
      true,
      'pt-checkin:' || NEW.id::text
    FROM (
      SELECT p.id AS recipient_id
      FROM public.profiles p
      WHERE p.role IN ('admin', 'manager')
        AND p.active = true
        AND p.membership_status = 'approved'

      UNION

      SELECT a.coach_user_id AS recipient_id
      FROM public.pt_client_assignments a
      JOIN public.pt_coaches c
        ON c.user_id = a.coach_user_id
       AND c.is_active = true
      JOIN public.profiles p
        ON p.id = a.coach_user_id
      WHERE a.member_id = NEW.member_id
        AND a.status = 'active'
        AND p.active = true
        AND p.membership_status = 'approved'
    ) AS targets
    ON CONFLICT (recipient_id, dedupe_key)
      WHERE dedupe_key IS NOT NULL
      DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_staff_pt_intake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_member_name text;
BEGIN
  SELECT COALESCE(NULLIF(BTRIM(display_name), ''), 'Medlem')
  INTO v_member_name
  FROM public.profiles
  WHERE id = NEW.member_id;

  INSERT INTO public.notifications (
    recipient_id, title, body, category, href,
    priority, requires_action, dedupe_key
  )
  SELECT
    targets.recipient_id,
    'Ny PT-innmelding',
    v_member_name || ' har sendt inn treningsmål og ønskje om PT-oppfølging. Gå gjennom innmeldinga.',
    'pt',
    'pt-intake:' || NEW.member_id::text,
    'high',
    true,
    'pt-intake:' || NEW.id::text
  FROM (
    SELECT p.id AS recipient_id
    FROM public.profiles p
    WHERE p.role IN ('admin', 'manager')
      AND p.active = true
      AND p.membership_status = 'approved'

    UNION

    SELECT a.coach_user_id AS recipient_id
    FROM public.pt_client_assignments a
    JOIN public.pt_coaches c
      ON c.user_id = a.coach_user_id
     AND c.is_active = true
    JOIN public.profiles p
      ON p.id = a.coach_user_id
    WHERE a.member_id = NEW.member_id
      AND a.status = 'active'
      AND p.active = true
      AND p.membership_status = 'approved'
  ) AS targets
  ON CONFLICT (recipient_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL
    DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_staff_new_pt_request() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_staff_new_pt_request() TO postgres, service_role;
REVOKE ALL ON FUNCTION public.notify_staff_pt_checkin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_staff_pt_checkin() TO postgres, service_role;
REVOKE ALL ON FUNCTION public.notify_staff_pt_intake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_staff_pt_intake() TO postgres, service_role;
