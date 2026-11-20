CREATE OR REPLACE FUNCTION public.notify_member_pt_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  status_label text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status IN ('approved', 'declined', 'cancelled') THEN

    -- A newly linked PT session already sends the more useful "Ny PT-time"
    -- notification. Avoid sending a second generic approval notice.
    IF NEW.pt_session_id IS NOT NULL
       AND NEW.pt_session_id IS DISTINCT FROM OLD.pt_session_id THEN
      RETURN NEW;
    END IF;

    status_label := CASE NEW.status
      WHEN 'approved' THEN 'Godkjend'
      WHEN 'declined' THEN 'Avslått'
      ELSE 'Avlyst'
    END;

    INSERT INTO public.notifications (
      recipient_id, title, body, category, href, priority, requires_action
    )
    VALUES (
      NEW.member_id,
      'PT-førespurnaden er oppdatert',
      'Status: ' || status_label || '.',
      'pt',
      'pt',
      'normal',
      false
    );
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_member_pt_request_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_member_pt_request_status() TO postgres, service_role;
