-- Use the existing pt_intakes questionnaire; staff/assigned PT requests are notification-backed.
CREATE OR REPLACE FUNCTION public.get_pt_intake_request_state(p_member_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE v_answer timestamptz; v_request timestamptz;
BEGIN
 IF p_member_id IS NULL OR auth.uid() IS NULL OR NOT public.is_active_user()
 OR NOT (public.is_admin_or_manager() OR app_private.is_pt_coach_for_member(p_member_id)) THEN
  RAISE EXCEPTION 'Ingen tilgang til denne PT-kunden.';
 END IF;
 SELECT max(created_at) INTO v_answer FROM public.pt_intakes WHERE member_id=p_member_id;
 SELECT max(created_at) INTO v_request FROM public.notifications
 WHERE recipient_id=p_member_id AND href='pt-intake-start' AND status='open';
 IF v_request IS NOT NULL AND (v_answer IS NULL OR v_request>v_answer) THEN RETURN 'pending'; END IF;
 IF v_answer IS NOT NULL THEN RETURN 'received'; END IF;
 RETURN 'not_requested';
END;
$fn$;

CREATE OR REPLACE FUNCTION public.request_pt_intake(p_member_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
DECLARE v_existing uuid;v_id uuid;
BEGIN
 IF p_member_id IS NULL OR auth.uid() IS NULL OR NOT public.is_active_user()
 OR NOT (public.is_admin_or_manager() OR app_private.is_pt_coach_for_member(p_member_id)) THEN
  RAISE EXCEPTION 'Ingen tilgang til å senda kartlegging til denne kunden.';
 END IF;
 PERFORM 1 FROM public.profiles
 WHERE id=p_member_id AND role='member' AND active=true AND membership_status='approved'
 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Vel ein aktiv, godkjend PT-kunde.'; END IF;
 IF public.get_pt_intake_request_state(p_member_id)='pending' THEN
  SELECT id INTO v_existing FROM public.notifications
  WHERE recipient_id=p_member_id AND href='pt-intake-start' AND status='open'
  ORDER BY created_at DESC LIMIT 1;
  RETURN v_existing;
 END IF;
 INSERT INTO public.notifications(recipient_id,title,body,category,href,priority,requires_action,dedupe_key)
 VALUES(p_member_id,'Oppstartskartlegging frå PT',
 'PT-en din ber deg svara på oppstartsskjemaet før de planlegg treninga.',
 'pt','pt-intake-start','normal',true,'pt-intake-request:'||gen_random_uuid()::text)
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.resolve_pt_intake_request_on_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $fn$
BEGIN
 UPDATE public.notifications
 SET status='resolved',resolved_at=now(),requires_action=false
 WHERE recipient_id=NEW.member_id AND href='pt-intake-start' AND status='open';
 RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.get_pt_intake_request_state(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.request_pt_intake(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_pt_intake_request_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_pt_intake(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.resolve_pt_intake_request_on_submit() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS pt_intake_request_resolved ON public.pt_intakes;
CREATE TRIGGER pt_intake_request_resolved AFTER INSERT ON public.pt_intakes
FOR EACH ROW EXECUTE FUNCTION public.resolve_pt_intake_request_on_submit();
