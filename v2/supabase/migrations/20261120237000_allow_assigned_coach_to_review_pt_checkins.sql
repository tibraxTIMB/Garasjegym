CREATE OR REPLACE FUNCTION public.pt_guard_member_checkin_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  -- An assigned coach may review a submitted check-in, but cannot alter
  -- the member's answers, identity, questions, or submission timestamp.
  IF app_private.is_pt_coach_for_member(OLD.member_id) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.member_id IS DISTINCT FROM OLD.member_id
      OR NEW.created_by IS DISTINCT FROM OLD.created_by
      OR NEW.title IS DISTINCT FROM OLD.title
      OR NEW.questions IS DISTINCT FROM OLD.questions
      OR NEW.answers IS DISTINCT FROM OLD.answers
      OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'PT kan berre endra gjennomgangsstatus på statussvaret.';
    END IF;

    IF OLD.status <> 'submitted'
       OR NEW.status <> 'reviewed'
       OR NEW.reviewed_at IS NULL THEN
      RAISE EXCEPTION 'PT kan berre markera eit innsendt statussvar som gjennomgått.';
    END IF;

    RETURN NEW;
  END IF;

  -- A member can submit their own pending check-in once, but cannot
  -- modify a submitted/reviewed response or its review metadata.
  IF auth.uid() IS NULL
     OR OLD.member_id IS DISTINCT FROM auth.uid()
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.member_id IS DISTINCT FROM OLD.member_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.questions IS DISTINCT FROM OLD.questions
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Medlem kan berre senda inn eigne svar på statussjekken.';
  END IF;

  IF OLD.status <> 'pending'
     OR NEW.status <> 'submitted'
     OR NEW.answers IS NULL THEN
    RAISE EXCEPTION 'Statussvaret kan berre sendast inn éin gong.';
  END IF;

  NEW.submitted_at := COALESCE(OLD.submitted_at, pg_catalog.now());
  RETURN NEW;
END;
$function$;
