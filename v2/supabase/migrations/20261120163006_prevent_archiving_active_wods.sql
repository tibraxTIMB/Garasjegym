CREATE OR REPLACE FUNCTION public.prevent_archiving_active_wod()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.is_archived IS DISTINCT FROM true
     AND NEW.is_archived IS TRUE THEN

    IF EXISTS (
      SELECT 1
      FROM public.pt_wod_assignments a
      WHERE a.wod_id = OLD.id
        AND a.status IN ('assigned', 'in_progress')
    ) THEN
      RAISE EXCEPTION
        'WOD-en har aktive PT-tildelingar. Fullfør eller avslutt tildelingane før du arkiverer WOD-en.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.wod_daily_schedules d
      WHERE d.wod_id = OLD.id
        AND d.is_published = true
        AND d.scheduled_date >= CURRENT_DATE
    ) OR EXISTS (
      SELECT 1
      FROM public.daily_wod d
      WHERE d.wod_id = OLD.id
    ) THEN
      RAISE EXCEPTION
        'WOD-en ligg i ein publisert dagsplan. Trekk tilbake eller flytt dagsplanen før arkivering.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.published = true
        AND c.cancelled_at IS NULL
        AND c.starts_at > pg_catalog.now()
        AND c.wod_ids @> pg_catalog.jsonb_build_array(OLD.id::text)
    ) THEN
      RAISE EXCEPTION
        'WOD-en er knytt til ein komande publisert gruppetime. Endre gruppetimen før arkivering.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.pt_sessions s
      WHERE s.status IN ('planned', 'published')
        AND s.starts_at > pg_catalog.now()
        AND OLD.id = ANY(s.wod_ids)
    ) THEN
      RAISE EXCEPTION
        'WOD-en er knytt til ein komande PT-time. Endre PT-timen før arkivering.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.class_live_sessions s
      WHERE s.status IN ('active', 'paused')
        AND (
          s.wod_id = OLD.id
          OR s.wod_ids @> pg_catalog.jsonb_build_array(OLD.id::text)
        )
    ) THEN
      RAISE EXCEPTION
        'WOD-en er i bruk i ei aktiv gruppetime. Fullfør gruppetimen før arkivering.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.pt_program_sessions ps
      JOIN public.pt_programs p ON p.id = ps.program_id
      WHERE ps.wod_id = OLD.id
        AND ps.archived_at IS NULL
        AND ps.status IN ('planned', 'in_progress')
        AND p.status = 'active'
        AND p.archived_at IS NULL
    ) THEN
      RAISE EXCEPTION
        'WOD-en er del av ein aktiv PT-plan. Oppdater PT-planen før arkivering.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.training_session_wods sw
      JOIN public.training_sessions ts ON ts.id = sw.session_id
      WHERE sw.wod_id = OLD.id
        AND ts.status = 'planned'
        AND (ts.session_date IS NULL OR ts.session_date >= CURRENT_DATE)
    ) THEN
      RAISE EXCEPTION
        'WOD-en er knytt til ei planlagd treningsøkt. Oppdater økta før arkivering.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS wods_prevent_archiving_active_references ON public.wods;
CREATE TRIGGER wods_prevent_archiving_active_references
BEFORE UPDATE OF is_archived ON public.wods
FOR EACH ROW
EXECUTE FUNCTION public.prevent_archiving_active_wod();

REVOKE ALL ON FUNCTION public.prevent_archiving_active_wod() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_archiving_active_wod() TO postgres, service_role;
