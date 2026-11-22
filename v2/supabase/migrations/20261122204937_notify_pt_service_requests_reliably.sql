-- Notify staff for the *current* PT enquiry flow (Mi PT-oversikt).
-- The older pt_requests trigger does not observe pt_service_requests.
-- A request is never silently accepted without its database notification:
-- any unexpected notification-insert failure rolls back the request insert.

CREATE OR REPLACE FUNCTION public.notify_staff_pt_service_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_member_name text;
BEGIN
  SELECT COALESCE(NULLIF(BTRIM(p.display_name), ''), 'Medlem')
  INTO v_member_name
  FROM public.profiles p
  WHERE p.id = NEW.member_id;

  INSERT INTO public.notifications (
    recipient_id, title, body, category, href,
    priority, requires_action, dedupe_key
  )
  SELECT
    p.id,
    'Ny førespurnad om PT-oppfølging',
    COALESCE(v_member_name, 'Medlem') || ' ønskjer kontakt om '
      || LEFT(COALESCE(NULLIF(BTRIM(NEW.service_title), ''), 'PT-oppfølging'), 80)
      || '. Opna førespurnaden og følg opp.',
    'pt',
    'pt-service-request:' || NEW.id::text,
    'high',
    true,
    'pt-service-request:' || NEW.id::text
  FROM public.profiles p
  WHERE p.role IN ('admin', 'manager')
    AND p.active = true
    AND p.membership_status = 'approved'
  ON CONFLICT (recipient_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pt_service_request_notify_staff ON public.pt_service_requests;
CREATE TRIGGER pt_service_request_notify_staff
AFTER INSERT ON public.pt_service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_pt_service_request();

-- A staff action is finished when the corresponding request is handled,
-- not merely when an administrator reads the inbox.
CREATE OR REPLACE FUNCTION public.notify_pt_service_request_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_label text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('assigned', 'declined', 'cancelled', 'completed') THEN
    UPDATE public.notifications
    SET status = 'resolved',
        resolved_at = COALESCE(resolved_at, pg_catalog.now())
    WHERE dedupe_key = 'pt-service-request:' || NEW.id::text
      AND status = 'open';
  END IF;

  IF NEW.status IN ('reviewing', 'assigned', 'declined') THEN
    v_label := CASE NEW.status
      WHEN 'reviewing' THEN 'Garasjen ser på førespurnaden din.'
      WHEN 'assigned' THEN 'Du har fått tildelt PT. Gå til Mi PT-oversikt for vidare oppfølging.'
      ELSE 'Førespurnaden er avslutta. Du kan senda ei ny dersom du ønskjer hjelp.'
    END;
    INSERT INTO public.notifications (
      recipient_id, title, body, category, href,
      priority, requires_action, dedupe_key
    ) VALUES (
      NEW.member_id,
      'Svar på PT-førespurnaden',
      v_label,
      'pt',
      'pt-studio',
      'normal',
      false,
      'pt-service-status:' || NEW.id::text || ':' || NEW.status
    )
    ON CONFLICT (recipient_id, dedupe_key)
      WHERE dedupe_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS pt_service_request_notify_status ON public.pt_service_requests;
CREATE TRIGGER pt_service_request_notify_status
AFTER UPDATE OF status ON public.pt_service_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_pt_service_request_status();

REVOKE ALL ON FUNCTION public.notify_staff_pt_service_request() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_staff_pt_service_request() TO postgres, service_role;
REVOKE ALL ON FUNCTION public.notify_pt_service_request_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_pt_service_request_status() TO postgres, service_role;

-- Recover any unnotified leads already stored before this fix.
-- This INSERT is idempotent and does not change the requests themselves.
INSERT INTO public.notifications (
  recipient_id, title, body, category, href,
  priority, requires_action, dedupe_key
)
SELECT
  staff.id,
  'Ny førespurnad om PT-oppfølging',
  COALESCE(NULLIF(BTRIM(member.display_name), ''), 'Medlem')
    || ' ønskjer kontakt om '
    || LEFT(COALESCE(NULLIF(BTRIM(req.service_title), ''), 'PT-oppfølging'), 80)
    || '. Opna førespurnaden og følg opp.',
  'pt',
  'pt-service-request:' || req.id::text,
  'high',
  true,
  'pt-service-request:' || req.id::text
FROM public.pt_service_requests req
JOIN public.profiles member ON member.id = req.member_id
JOIN public.profiles staff
  ON staff.role IN ('admin', 'manager')
 AND staff.active = true
 AND staff.membership_status = 'approved'
WHERE req.status IN ('pending', 'reviewing')
ON CONFLICT (recipient_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL DO NOTHING;
