ALTER TABLE public.pt_requests
  ADD COLUMN IF NOT EXISTS pt_session_id uuid;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pt_requests_pt_session_id_fkey'
      AND conrelid = 'public.pt_requests'::regclass
  ) THEN
    ALTER TABLE public.pt_requests
      ADD CONSTRAINT pt_requests_pt_session_id_fkey
      FOREIGN KEY (pt_session_id)
      REFERENCES public.pt_sessions(id)
      ON DELETE SET NULL;
  END IF;
END
$constraint$;

CREATE INDEX IF NOT EXISTS pt_requests_pt_session_id_idx
  ON public.pt_requests(pt_session_id)
  WHERE pt_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_pt_session_from_request(
  p_request_id uuid,
  p_starts_at timestamptz,
  p_session_type text DEFAULT 'guided',
  p_staff_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'app_private', 'pg_temp'
AS $function$
DECLARE
  v_request public.pt_requests%rowtype;
  v_session_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.';
  END IF;

  SELECT * INTO v_request
  FROM public.pt_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PT-førespurnaden finst ikkje.';
  END IF;

  IF NOT public.is_admin_or_manager()
     AND NOT app_private.is_pt_coach_for_member(v_request.member_id) THEN
    RAISE EXCEPTION 'Berre administrator eller PT som er tildelt kunden kan oppretta time frå førespurnaden.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_request.member_id
      AND p.active = true
      AND p.membership_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Kunden har ikkje ein aktiv og godkjend medlemskonto.';
  END IF;

  -- Idempotent retry: a request can never create two PT sessions.
  IF v_request.pt_session_id IS NOT NULL THEN
    RETURN v_request.pt_session_id;
  END IF;

  IF v_request.status NOT IN ('pending', 'approved') THEN
    RAISE EXCEPTION 'Berre ventande eller godkjende førespurnader kan få oppretta PT-time.';
  END IF;

  IF p_starts_at IS NULL OR p_starts_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'PT-timen må leggjast fram i tid.';
  END IF;

  IF COALESCE(p_session_type, 'guided') NOT IN ('guided', 'free', 'wod') THEN
    RAISE EXCEPTION 'Ugyldig type PT-time.';
  END IF;

  INSERT INTO public.pt_sessions(
    client_id, title, starts_at, duration_minutes, capacity,
    status, session_type, created_by, message
  ) VALUES (
    v_request.member_id,
    'Personleg trening',
    p_starts_at,
    60,
    1,
    'planned',
    COALESCE(p_session_type, 'guided'),
    auth.uid(),
    'Oppretta frå PT-førespurnad'
  )
  RETURNING id INTO v_session_id;

  UPDATE public.pt_requests
  SET pt_session_id = v_session_id,
      status = 'approved',
      staff_note = COALESCE(p_staff_note, staff_note),
      handled_by = auth.uid(),
      handled_at = pg_catalog.now()
  WHERE id = p_request_id;

  RETURN v_session_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_pt_session_from_request(uuid, timestamptz, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pt_session_from_request(uuid, timestamptz, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pt_sessions_prevent_history_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.pt_bookings b WHERE b.session_id = OLD.id
  ) OR OLD.workout_log_id IS NOT NULL OR OLD.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION
      'PT-timen har booking eller historikk. Avlys timen i staden for å sletta han.';
  END IF;
  RETURN OLD;
END;
$function$;
