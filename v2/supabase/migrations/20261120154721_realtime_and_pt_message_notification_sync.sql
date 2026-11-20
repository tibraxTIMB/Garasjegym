CREATE OR REPLACE FUNCTION public.notify_pt_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_sender_name text;
BEGIN
  SELECT COALESCE(NULLIF(BTRIM(display_name), ''), 'Medlem')
  INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  IF NEW.sender_id = NEW.client_id THEN
    INSERT INTO public.notifications (
      recipient_id, title, body, category, href, priority,
      requires_action, dedupe_key
    )
    SELECT
      targets.recipient_id,
      'Ny melding frå ' || v_sender_name,
      LEFT(COALESCE(NEW.body, ''), 180),
      'pt',
      'pt-client:' || NEW.client_id::text,
      'high',
      true,
      'pt-message:' || NEW.id::text
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
      WHERE a.member_id = NEW.client_id
        AND a.status = 'active'
        AND p.active = true
        AND p.membership_status = 'approved'
    ) AS targets
    ON CONFLICT (recipient_id, dedupe_key)
      WHERE dedupe_key IS NOT NULL
      DO NOTHING;
  ELSE
    INSERT INTO public.notifications (
      recipient_id, title, body, category, href, priority,
      requires_ack, dedupe_key
    )
    VALUES (
      NEW.client_id,
      'Ny melding frå PT',
      LEFT(COALESCE(NEW.body, ''), 180),
      'pt',
      'pt-studio',
      'normal',
      false,
      'pt-message:' || NEW.id::text
    )
    ON CONFLICT (recipient_id, dedupe_key)
      WHERE dedupe_key IS NOT NULL
      DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_pt_message_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.notifications
  SET archived_at = COALESCE(archived_at, pg_catalog.now()),
      status = CASE WHEN status = 'open' THEN 'dismissed' ELSE status END
  WHERE dedupe_key = 'pt-message:' || OLD.id::text
    AND archived_at IS NULL;

  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS pt_message_archive_notifications ON public.pt_messages;
CREATE TRIGGER pt_message_archive_notifications
AFTER DELETE ON public.pt_messages
FOR EACH ROW
EXECUTE FUNCTION public.archive_pt_message_notifications();

REVOKE ALL ON FUNCTION public.notify_pt_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_pt_message() TO postgres, service_role;
REVOKE ALL ON FUNCTION public.archive_pt_message_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_pt_message_notifications() TO postgres, service_role;

DO $publication$
DECLARE
  v_table text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH v_table IN ARRAY ARRAY['notifications', 'pt_messages', 'pt_sessions']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = v_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
      END IF;
    END LOOP;
  END IF;
END;
$publication$;
