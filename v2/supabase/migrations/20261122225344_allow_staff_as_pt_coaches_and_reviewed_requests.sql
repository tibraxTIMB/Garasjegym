-- Admin og manager kan òg vera PT, utan å endra rolla si til medlem.
-- Kundar må framleis vera aktive og godkjende medlemskontoar.
CREATE OR REPLACE FUNCTION app_private.is_pt_coach_for_member(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','app_private'
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND public.is_active_user()
     AND p_member_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.pt_client_assignments a
       JOIN public.pt_coaches c ON c.user_id=a.coach_user_id AND c.is_active=true
       JOIN public.profiles cp ON cp.id=c.user_id
       JOIN public.profiles mp ON mp.id=a.member_id
       WHERE a.coach_user_id=auth.uid()
         AND a.member_id=p_member_id
         AND a.status='active'
         AND cp.active=true
         AND (
           cp.role IN ('admin','manager')
           OR (cp.role='member' AND cp.membership_status='approved')
         )
         AND mp.role='member'
         AND mp.active=true
         AND mp.membership_status='approved'
     );
$function$;

CREATE OR REPLACE FUNCTION public.assign_pt_coach(
  p_member_id uuid,
  p_coach_user_id uuid,
  p_admin_note text DEFAULT '',
  p_service_request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public'
AS $function$
DECLARE
  v_capacity integer;
  v_active_count integer;
  v_assignment_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() OR NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Berre aktiv admin eller manager kan tildele PT.';
  END IF;
  IF p_member_id IS NULL OR p_coach_user_id IS NULL OR p_member_id=p_coach_user_id THEN
    RAISE EXCEPTION 'Vel eit medlem og ein annan brukar som PT.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=p_member_id AND p.role='member'
      AND p.active=true AND p.membership_status='approved'
  ) THEN
    RAISE EXCEPTION 'Kunden må vera eit aktivt og godkjent medlem.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=p_coach_user_id AND p.active=true
      AND (
        p.role IN ('admin','manager')
        OR (p.role='member' AND p.membership_status='approved')
      )
  ) THEN
    RAISE EXCEPTION 'PT må vera aktiv administrator, driftsansvarleg eller godkjent medlem.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('pt-member:' || p_member_id::text,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('pt-coach:' || p_coach_user_id::text,0));

  SELECT c.capacity INTO v_capacity
  FROM public.pt_coaches c
  WHERE c.user_id=p_coach_user_id AND c.is_active=true
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT-en er ikkje registrert eller aktiv.'; END IF;

  SELECT count(*) INTO v_active_count
  FROM public.pt_client_assignments a
  WHERE a.coach_user_id=p_coach_user_id
    AND a.status='active'
    AND a.member_id<>p_member_id;
  IF v_active_count>=v_capacity THEN
    RAISE EXCEPTION 'PT-en har nådd kapasiteten sin (% kundar).',v_capacity;
  END IF;

  IF p_service_request_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pt_service_requests r
    WHERE r.id=p_service_request_id
      AND r.member_id=p_member_id
      AND r.status IN ('pending','reviewing')
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'PT-førespurnaden er ikkje lenger open for tildeling.';
  END IF;

  UPDATE public.pt_client_assignments
  SET status='ended',ended_at=now(),updated_at=now()
  WHERE member_id=p_member_id AND status='active';

  INSERT INTO public.pt_client_assignments(member_id,coach_user_id,assigned_by,admin_note)
  VALUES (p_member_id,p_coach_user_id,auth.uid(),coalesce(p_admin_note,''))
  RETURNING id INTO v_assignment_id;

  IF p_service_request_id IS NOT NULL THEN
    UPDATE public.pt_service_requests
    SET status='assigned',assigned_coach_id=p_coach_user_id,
        handled_by=auth.uid(),handled_at=now(),updated_at=now()
    WHERE id=p_service_request_id AND member_id=p_member_id
      AND status IN ('pending','reviewing');
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PT-førespurnaden kunne ikkje oppdaterast. Ingen endringar er lagra.';
    END IF;
  END IF;
  RETURN v_assignment_id;
END;
$function$;
