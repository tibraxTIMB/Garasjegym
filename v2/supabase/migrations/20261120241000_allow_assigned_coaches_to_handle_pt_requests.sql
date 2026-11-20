CREATE OR REPLACE FUNCTION public.pt_guard_member_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'app_private', 'pg_temp'
AS $function$
BEGIN
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  -- An assigned coach may handle the request, add a staff note, and archive
  -- it, but cannot rewrite the member's request or link an unrelated session.
  IF app_private.is_pt_coach_for_member(OLD.member_id) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.member_id IS DISTINCT FROM OLD.member_id
      OR NEW.preferred_at IS DISTINCT FROM OLD.preferred_at
      OR NEW.alternative_at IS DISTINCT FROM OLD.alternative_at
      OR NEW.availability_note IS DISTINCT FROM OLD.availability_note
      OR NEW.goal IS DISTINCT FROM OLD.goal
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'PT kan ikkje endra innhaldet i medlemmet si førespurnad.';
    END IF;

    IF NEW.pt_session_id IS DISTINCT FROM OLD.pt_session_id THEN
      IF OLD.pt_session_id IS NOT NULL
         OR NEW.pt_session_id IS NULL
         OR NEW.status <> 'approved'
         OR NOT EXISTS (
           SELECT 1
           FROM public.pt_sessions s
           WHERE s.id = NEW.pt_session_id
             AND s.client_id = OLD.member_id
             AND s.created_by = auth.uid()
             AND s.status = 'planned'
         ) THEN
        RAISE EXCEPTION 'PT-førespurnaden kan berre koplast éin gong til ein ny time for same kunde.';
      END IF;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status = 'cancelled'
         OR NEW.status NOT IN ('pending', 'approved', 'declined') THEN
        RAISE EXCEPTION 'Ugyldig statusendring på PT-førespurnaden.';
      END IF;

      IF NEW.pt_session_id IS NOT NULL AND NEW.status <> 'approved' THEN
        RAISE EXCEPTION 'Ei førespurnad med oppretta PT-time må stå som godkjend.';
      END IF;
    END IF;

    IF NEW.handled_by IS DISTINCT FROM OLD.handled_by
       AND NEW.handled_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'PT kan berre registrera seg sjølv som behandlar.';
    END IF;

    IF NEW.handled_at IS DISTINCT FROM OLD.handled_at
       AND NEW.handled_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'PT må registrerast som behandlar når behandlingstidspunktet blir endra.';
    END IF;

    NEW.updated_at := pg_catalog.clock_timestamp();
    RETURN NEW;
  END IF;

  -- A member can only cancel their own pending request; staff fields and
  -- the link to an already created PT session are immutable to members.
  IF auth.uid() IS NULL
     OR OLD.member_id IS DISTINCT FROM auth.uid()
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.member_id IS DISTINCT FROM OLD.member_id
     OR NEW.preferred_at IS DISTINCT FROM OLD.preferred_at
     OR NEW.alternative_at IS DISTINCT FROM OLD.alternative_at
     OR NEW.availability_note IS DISTINCT FROM OLD.availability_note
     OR NEW.goal IS DISTINCT FROM OLD.goal
     OR NEW.staff_note IS DISTINCT FROM OLD.staff_note
     OR NEW.handled_by IS DISTINCT FROM OLD.handled_by
     OR NEW.handled_at IS DISTINCT FROM OLD.handled_at
     OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.pt_session_id IS DISTINCT FROM OLD.pt_session_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Medlem kan berre avlysa eiga PT-førespurnad.';
  END IF;

  IF OLD.status <> 'pending' OR NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Berre ventande PT-førespurnader kan avlysast.';
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$function$;
