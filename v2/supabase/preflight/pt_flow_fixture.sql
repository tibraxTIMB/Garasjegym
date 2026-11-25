\set ON_ERROR_STOP on
-- Disposable PostgreSQL service only. Synthetic accounts; no production credentials or rows.
create role authenticated nologin;
create role anon nologin;
create schema auth;
create schema app_private;
grant usage on schema auth,app_private,public to authenticated,anon;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key,active boolean default true,membership_status text default 'approved',role text default 'member');
create table app_private.coaching(coach_id uuid,member_id uuid);
create function public.is_active_user() returns boolean language sql stable security definer set search_path=pg_catalog,public as $$select exists(select 1 from public.profiles where id=auth.uid() and active and membership_status='approved')$$;
create function public.is_admin_or_manager() returns boolean language sql stable security definer set search_path=pg_catalog,public as $$select exists(select 1 from public.profiles where id=auth.uid() and active and role in ('admin','manager'))$$;
create function app_private.is_pt_coach_for_member(member uuid) returns boolean language sql stable security definer set search_path=pg_catalog,app_private as $$select exists(select 1 from app_private.coaching where coach_id=auth.uid() and member_id=member)$$;
create table public.pt_program_templates(id uuid primary key,is_active boolean default true);
create table public.pt_programs(id uuid primary key default gen_random_uuid(),client_id uuid not null,template_id uuid,title text not null,description text default '',start_date date,weeks integer,focus_areas text[],status text default 'active',created_by uuid,coach_notes text,created_at timestamptz default now(),updated_at timestamptz default now(),program_type text,archived_at timestamptz,archived_by uuid,archived_previous_status text);
create table public.pt_program_sessions(id uuid primary key default gen_random_uuid(),program_id uuid not null references public.pt_programs(id),sequence_no int,title text,wod_id uuid,scheduled_date date,workout_snapshot jsonb default '{}',coach_note text,status text not null default 'planned',completed_at timestamptz,workout_log_id uuid,created_at timestamptz default now(),updated_at timestamptz default now(),week_no int default 1,day_no int default 1,session_kind text default 'training',focus_area text,estimated_minutes int,archived_at timestamptz,archived_by uuid);
create table public.workout_logs(id uuid primary key,member_id uuid not null,source_wod_id uuid);
create table public.pt_wod_assignments(id uuid primary key,member_id uuid not null,wod_id uuid,status text default 'assigned',completed_at timestamptz,workout_log_id uuid);
alter table public.pt_programs enable row level security;
alter table public.pt_program_sessions enable row level security;
alter table public.workout_logs enable row level security;
alter table public.pt_wod_assignments enable row level security;
grant select,insert,update,delete on public.pt_programs,public.pt_program_sessions,public.workout_logs,public.pt_wod_assignments to authenticated;
grant select on public.pt_program_templates to authenticated;
create policy own_logs on public.workout_logs for all to authenticated using(member_id=auth.uid()) with check(member_id=auth.uid());
create policy own_assign on public.pt_wod_assignments for all to authenticated using(member_id=auth.uid()) with check(member_id=auth.uid());
-- Stub only the lower-level workout writer; the real live PT-linking RPC is tested below.
create function public.save_workout_atomic(p_workout jsonb) returns uuid language plpgsql as $$declare v_id uuid:=(p_workout->>'id')::uuid;begin insert into public.workout_logs values(v_id,auth.uid(),nullif(p_workout->>'source_wod_id','')::uuid) on conflict(id) do nothing;return v_id;end;$$;
create policy pt_program_sessions_staff_insert on public.pt_program_sessions for INSERT to authenticated with check ((is_active_user() AND (is_admin_or_manager() OR (EXISTS ( SELECT 1
   FROM pt_programs p
  WHERE ((p.id = pt_program_sessions.program_id) AND (p.archived_at IS NULL) AND app_private.is_pt_coach_for_member(p.client_id)))))));
create policy pt_program_sessions_read_parent on public.pt_program_sessions for SELECT to authenticated using ((is_active_user() AND (is_admin_or_manager() OR ((archived_at IS NULL) AND (EXISTS ( SELECT 1
   FROM pt_programs p
  WHERE ((p.id = pt_program_sessions.program_id) AND (p.client_id = ( SELECT auth.uid() AS uid)) AND (p.archived_at IS NULL))))) OR (EXISTS ( SELECT 1
   FROM pt_programs p
  WHERE ((p.id = pt_program_sessions.program_id) AND app_private.is_pt_coach_for_member(p.client_id)))))));
create policy pt_program_sessions_update_member_or_staff on public.pt_program_sessions for UPDATE to authenticated using ((is_active_user() AND (is_admin_or_manager() OR ((status = ANY (ARRAY['planned'::text, 'in_progress'::text])) AND (EXISTS ( SELECT 1
   FROM pt_programs p
  WHERE ((p.id = pt_program_sessions.program_id) AND (p.client_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM pt_programs p
  WHERE ((p.id = pt_program_sessions.program_id) AND app_private.is_pt_coach_for_member(p.client_id))))))) with check ((is_active_user() AND (is_admin_or_manager() OR ((status = ANY (ARRAY['completed'::text, 'in_progress'::text])) AND (EXISTS ( SELECT 1
   FROM pt_programs p
  WHERE ((p.id = pt_program_sessions.program_id) AND (p.client_id = ( SELECT auth.uid() AS uid)))))) OR (EXISTS ( SELECT 1
   FROM pt_programs p
  WHERE ((p.id = pt_program_sessions.program_id) AND app_private.is_pt_coach_for_member(p.client_id)))))));
create policy pt_programs_staff_insert on public.pt_programs for INSERT to authenticated with check ((is_active_user() AND ((is_admin_or_manager() AND (created_by = ( SELECT auth.uid() AS uid))) OR ((created_by = ( SELECT auth.uid() AS uid)) AND app_private.is_pt_coach_for_member(client_id)))));
create policy pt_programs_read_own_or_staff on public.pt_programs for SELECT to authenticated using ((is_active_user() AND (is_admin_or_manager() OR ((client_id = ( SELECT auth.uid() AS uid)) AND (archived_at IS NULL)) OR app_private.is_pt_coach_for_member(client_id))));
create policy pt_programs_staff_update on public.pt_programs for UPDATE to authenticated using ((is_active_user() AND (is_admin_or_manager() OR app_private.is_pt_coach_for_member(client_id)))) with check ((is_active_user() AND (is_admin_or_manager() OR app_private.is_pt_coach_for_member(client_id))));
CREATE OR REPLACE FUNCTION public.create_pt_program_with_sessions(p_program jsonb, p_sessions jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'app_private', 'pg_temp'
AS $function$
DECLARE
  v_program_id uuid;
  v_client_id uuid;
  v_session jsonb;
  v_index integer := 0;
  v_is_staff boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.';
  END IF;
  v_is_staff:=public.is_admin_or_manager();
  IF jsonb_typeof(p_program)<>'object' THEN
    RAISE EXCEPTION 'Programdata er ugyldige.';
  END IF;
  IF jsonb_typeof(p_sessions)<>'array' OR jsonb_array_length(p_sessions)=0 THEN
    RAISE EXCEPTION 'Programmet må innehalda minst éi økt eller eitt steg.';
  END IF;
  IF nullif(p_program->>'client_id','') IS NULL THEN
    RAISE EXCEPTION 'Programmet må ha ein kunde.';
  END IF;
  v_client_id:=(p_program->>'client_id')::uuid;
  PERFORM 1 FROM public.profiles p
  WHERE p.id=v_client_id AND p.active=true AND p.membership_status='approved'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kunden har ikkje ein aktiv og godkjend medlemskonto.';
  END IF;
  IF NOT v_is_staff AND NOT app_private.is_pt_coach_for_member(v_client_id) THEN
    RAISE EXCEPTION 'Du kan berre oppretta program for kundar som er tildelte deg.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.pt_programs p
    WHERE p.client_id=v_client_id AND p.status='active' AND p.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Kunden har allereie ein aktiv treningsplan. Arkiver eller set planen på pause før du tildeler ein ny.';
  END IF;
  IF nullif(btrim(p_program->>'title'),'') IS NULL THEN
    RAISE EXCEPTION 'Programmet må ha namn.';
  END IF;
  IF coalesce(nullif(p_program->>'program_type',''),'intro') NOT IN ('intro','course','training_plan','progression') THEN
    RAISE EXCEPTION 'Ugyldig programtype.';
  END IF;
  IF nullif(p_program->>'template_id','') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pt_program_templates t
    WHERE t.id=(p_program->>'template_id')::uuid AND t.is_active=true
  ) THEN
    RAISE EXCEPTION 'Programmalen er ikkje lenger aktiv.';
  END IF;
  INSERT INTO public.pt_programs(
    client_id,template_id,title,description,start_date,weeks,focus_areas,
    status,created_by,coach_notes,program_type
  ) VALUES (
    v_client_id,nullif(p_program->>'template_id','')::uuid,btrim(p_program->>'title'),
    coalesce(p_program->>'description',''),nullif(p_program->>'start_date','')::date,
    greatest(1,least(52,coalesce(nullif(p_program->>'weeks','')::integer,6))),
    CASE WHEN jsonb_typeof(p_program->'focus_areas')='array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_program->'focus_areas'))
      ELSE '{}'::text[] END,
    'active',auth.uid(),coalesce(p_program->>'coach_notes',''),
    coalesce(nullif(p_program->>'program_type',''),'intro')
  ) RETURNING id INTO v_program_id;
  FOR v_session IN SELECT value FROM jsonb_array_elements(p_sessions) LOOP
    v_index:=v_index+1;
    IF nullif(btrim(v_session->>'title'),'') IS NULL THEN
      RAISE EXCEPTION 'Programsteg nummer % manglar namn.',v_index;
    END IF;
    INSERT INTO public.pt_program_sessions(
      program_id,sequence_no,title,wod_id,scheduled_date,workout_snapshot,
      coach_note,status,week_no,day_no,session_kind,focus_area,estimated_minutes
    ) VALUES (
      v_program_id,coalesce(nullif(v_session->>'sequence_no','')::integer,v_index),
      btrim(v_session->>'title'),nullif(v_session->>'wod_id','')::uuid,
      nullif(v_session->>'scheduled_date','')::date,
      CASE WHEN jsonb_typeof(v_session->'workout_snapshot')='object' THEN v_session->'workout_snapshot' ELSE '{}'::jsonb END,
      coalesce(v_session->>'coach_note',''),coalesce(nullif(v_session->>'status',''),'planned'),
      greatest(1,least(52,coalesce(nullif(v_session->>'week_no','')::integer,1))),
      greatest(1,least(7,coalesce(nullif(v_session->>'day_no','')::integer,1))),
      coalesce(nullif(v_session->>'session_kind',''),'training'),
      coalesce(v_session->>'focus_area',''),nullif(v_session->>'estimated_minutes','')::integer
    );
  END LOOP;
  RETURN v_program_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_pt_program_coach_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'app_private'
AS $function$
BEGIN
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;
  IF NOT app_private.is_pt_coach_for_member(OLD.client_id) THEN
    RAISE EXCEPTION 'Berre PT-en som er tildelt kunden kan redigera programmet.';
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Kunde og opprettar kan ikkje bytast på eit eksisterande PT-program.';
  END IF;
  IF current_user='authenticated' AND (
    NEW.archived_at IS DISTINCT FROM OLD.archived_at
    OR NEW.archived_by IS DISTINCT FROM OLD.archived_by
    OR NEW.archived_previous_status IS DISTINCT FROM OLD.archived_previous_status
    OR NEW.status IS DISTINCT FROM OLD.status
  ) THEN
    RAISE EXCEPTION 'Arkivering og programstatus må endrast gjennom dei godkjende PT-funksjonane.';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_pt_session_archive_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'app_private'
AS $function$
DECLARE
  v_client_id uuid;
BEGIN
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.archived_by IS DISTINCT FROM OLD.archived_by THEN
    SELECT p.client_id INTO v_client_id
    FROM public.pt_programs p
    WHERE p.id=OLD.program_id;
    IF current_user='authenticated'
       OR NOT app_private.is_pt_coach_for_member(v_client_id) THEN
      RAISE EXCEPTION 'Berre PT-en som er tildelt kunden eller administrator kan arkivera PT-økter.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_single_pt_workout_log_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.workout_log_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Serialize cross-table link checks; the partial unique indexes protect
  -- duplicate links within either table.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'garasjegym:pt-workout-link:' || NEW.workout_log_id::text,
      0
    )
  );

  IF TG_TABLE_NAME = 'pt_wod_assignments' THEN
    IF EXISTS (
      SELECT 1
      FROM public.pt_wod_assignments a
      WHERE a.workout_log_id = NEW.workout_log_id
        AND a.id <> NEW.id
    ) OR EXISTS (
      SELECT 1
      FROM public.pt_program_sessions ps
      WHERE ps.workout_log_id = NEW.workout_log_id
    ) THEN
      RAISE EXCEPTION 'Treningsloggen er allereie knytt til ei anna PT-oppgåve eller programøkt.';
    END IF;
  ELSIF TG_TABLE_NAME = 'pt_program_sessions' THEN
    IF EXISTS (
      SELECT 1
      FROM public.pt_program_sessions ps
      WHERE ps.workout_log_id = NEW.workout_log_id
        AND ps.id <> NEW.id
    ) OR EXISTS (
      SELECT 1
      FROM public.pt_wod_assignments a
      WHERE a.workout_log_id = NEW.workout_log_id
    ) THEN
      RAISE EXCEPTION 'Treningsloggen er allereie knytt til ei anna PT-oppgåve eller programøkt.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pt_guard_member_program_session_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'app_private'
AS $function$
DECLARE
  v_client_id uuid;
BEGIN
  IF public.is_admin_or_manager() THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.program_id IS DISTINCT FROM OLD.program_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'PT-øktas identitet og programtilhøyrsle kan ikkje endrast.';
  END IF;

  SELECT p.client_id INTO v_client_id
  FROM public.pt_programs p
  WHERE p.id=OLD.program_id;

  IF app_private.is_pt_coach_for_member(v_client_id) THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.workout_log_id IS DISTINCT FROM OLD.workout_log_id
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      RAISE EXCEPTION 'PT kan ikkje fullføra økta på vegner av medlemmet.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.sequence_no IS DISTINCT FROM OLD.sequence_no
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.wod_id IS DISTINCT FROM OLD.wod_id
    OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
    OR NEW.workout_snapshot IS DISTINCT FROM OLD.workout_snapshot
    OR NEW.coach_note IS DISTINCT FROM OLD.coach_note
    OR NEW.week_no IS DISTINCT FROM OLD.week_no
    OR NEW.day_no IS DISTINCT FROM OLD.day_no
    OR NEW.session_kind IS DISTINCT FROM OLD.session_kind
    OR NEW.focus_area IS DISTINCT FROM OLD.focus_area
    OR NEW.estimated_minutes IS DISTINCT FROM OLD.estimated_minutes
    OR NEW.archived_at IS DISTINCT FROM OLD.archived_at
    OR NEW.archived_by IS DISTINCT FROM OLD.archived_by THEN
    RAISE EXCEPTION 'Medlem kan berre oppdatera status og eiga treningslogg på PT-økta.';
  END IF;

  IF OLD.status NOT IN ('planned','in_progress')
     OR NEW.status NOT IN ('in_progress','completed') THEN
    RAISE EXCEPTION 'Ugyldig statusendring for PT-økta.';
  END IF;

  IF NEW.workout_log_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workout_logs wl
    WHERE wl.id=NEW.workout_log_id
      AND wl.member_id=(SELECT auth.uid())
      AND wl.source_wod_id IS NOT DISTINCT FROM OLD.wod_id
  ) THEN
    RAISE EXCEPTION 'PT-økta kan berre koplast til di eiga treningsøkt for rett WOD.';
  END IF;

  -- A progression step is a coaching milestone, not necessarily a workout.
  -- All actual training sessions must still link to a saved workout log.
  IF NEW.status='completed'
     AND NEW.workout_log_id IS NULL
     AND OLD.session_kind IS DISTINCT FROM 'progression_step' THEN
    RAISE EXCEPTION 'PT-økta kan berre fullførast saman med ei lagra treningsøkt.';
  END IF;

  IF NEW.workout_log_id IS DISTINCT FROM OLD.workout_log_id AND NEW.status<>'completed' THEN
    RAISE EXCEPTION 'Treningslogg kan berre koplast til ei fullført PT-økt.';
  END IF;

  IF NEW.status='completed' THEN
    NEW.completed_at:=coalesce(OLD.completed_at,now());
  ELSE
    NEW.completed_at:=NULL;
  END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_workout_with_pt_links(p_workout jsonb, p_assignment_id uuid DEFAULT NULL::uuid, p_program_session_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_log_member_id uuid;
  v_log_source_wod_id uuid;
  v_status text;
  v_existing_log_id uuid;
  v_linked_wod_id uuid;
  v_updated_id uuid;
  v_program_id uuid;
  v_program_client_id uuid;
  v_program_archived_at timestamptz;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Aktiv medlemskonto krevst for å lagra trening.';
  END IF;

  IF p_assignment_id IS NOT NULL AND p_program_session_id IS NOT NULL THEN
    RAISE EXCEPTION 'Ei treningsøkt kan berre fullføra éi PT-oppgåve om gongen.';
  END IF;

  v_workout_id := public.save_workout_atomic(p_workout);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'garasjegym:pt-workout-link:' || v_workout_id::text,
      0
    )
  );

  SELECT wl.member_id, wl.source_wod_id
  INTO v_log_member_id, v_log_source_wod_id
  FROM public.workout_logs wl
  WHERE wl.id = v_workout_id
  FOR UPDATE;

  IF NOT FOUND OR v_log_member_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Treningsloggen finst ikkje eller høyrer ikkje til deg.';
  END IF;

  IF v_log_source_wod_id IS DISTINCT FROM NULLIF(p_workout->>'source_wod_id', '')::uuid THEN
    RAISE EXCEPTION 'Lagringsnøkkelen er allereie brukt for ein annan WOD. Start økta på nytt før du lagrar.';
  END IF;

  IF p_assignment_id IS NOT NULL THEN
    SELECT a.status, a.workout_log_id, a.wod_id
    INTO v_status, v_existing_log_id, v_linked_wod_id
    FROM public.pt_wod_assignments a
    WHERE a.id = p_assignment_id
      AND a.member_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PT-tildelinga finst ikkje eller høyrer ikkje til deg.';
    END IF;

    IF v_linked_wod_id IS DISTINCT FROM v_log_source_wod_id THEN
      RAISE EXCEPTION 'Treningsøkta samsvarar ikkje med WOD-en som er tildelt.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.pt_wod_assignments a
      WHERE a.workout_log_id = v_workout_id
        AND a.id <> p_assignment_id
    ) OR EXISTS (
      SELECT 1 FROM public.pt_program_sessions ps
      WHERE ps.workout_log_id = v_workout_id
    ) THEN
      RAISE EXCEPTION 'Treningsloggen er allereie brukt til å fullføra ei anna PT-oppgåve.';
    END IF;

    IF v_status = 'completed' THEN
      IF v_existing_log_id IS DISTINCT FROM v_workout_id THEN
        RAISE EXCEPTION 'PT-tildelinga er allereie fullført med ei anna treningsøkt.';
      END IF;
    ELSIF v_status IN ('assigned', 'in_progress') THEN
      UPDATE public.pt_wod_assignments
      SET status = 'completed',
          completed_at = COALESCE(completed_at, pg_catalog.now()),
          workout_log_id = v_workout_id
      WHERE id = p_assignment_id
        AND member_id = v_user_id
        AND status IN ('assigned', 'in_progress')
      RETURNING id INTO v_updated_id;

      IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'PT-tildelinga kunne ikkje fullførast. Ingen delvis lagring er gjort.';
      END IF;
    ELSE
      RAISE EXCEPTION 'PT-tildelinga har ein status som ikkje kan fullførast.';
    END IF;
  END IF;

  IF p_program_session_id IS NOT NULL THEN
    -- Read the parent program without FOR UPDATE: members have SELECT rights
    -- on their own program, but deliberately cannot update program metadata.
    -- Lock only the member-owned session row that is being completed.
    SELECT ps.program_id
    INTO v_program_id
    FROM public.pt_program_sessions ps
    WHERE ps.id = p_program_session_id
      AND ps.archived_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PT-programøkta finst ikkje, er arkivert eller er ikkje tilgjengeleg.';
    END IF;

    SELECT p.client_id, p.archived_at
    INTO v_program_client_id, v_program_archived_at
    FROM public.pt_programs p
    WHERE p.id = v_program_id
      AND p.status = 'active';

    IF NOT FOUND OR v_program_archived_at IS NOT NULL
       OR v_program_client_id IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'PT-programmet er ikkje aktivt eller høyrer ikkje til deg.';
    END IF;

    SELECT ps.status, ps.workout_log_id, ps.wod_id
    INTO v_status, v_existing_log_id, v_linked_wod_id
    FROM public.pt_program_sessions ps
    WHERE ps.id = p_program_session_id
      AND ps.program_id = v_program_id
      AND ps.archived_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PT-programøkta er ikkje lenger aktiv.';
    END IF;

    IF v_linked_wod_id IS NOT NULL
       AND v_linked_wod_id IS DISTINCT FROM v_log_source_wod_id THEN
      RAISE EXCEPTION 'Treningsøkta samsvarar ikkje med WOD-en i PT-programmet.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.pt_program_sessions ps
      WHERE ps.workout_log_id = v_workout_id
        AND ps.id <> p_program_session_id
    ) OR EXISTS (
      SELECT 1 FROM public.pt_wod_assignments a
      WHERE a.workout_log_id = v_workout_id
    ) THEN
      RAISE EXCEPTION 'Treningsloggen er allereie brukt til å fullføra ei anna PT-oppgåve.';
    END IF;

    IF v_status = 'completed' THEN
      IF v_existing_log_id IS DISTINCT FROM v_workout_id THEN
        RAISE EXCEPTION 'PT-programøkta er allereie fullført med ei anna treningsøkt.';
      END IF;
    ELSIF v_status IN ('planned', 'in_progress') THEN
      UPDATE public.pt_program_sessions
      SET status = 'completed',
          completed_at = COALESCE(completed_at, pg_catalog.now()),
          workout_log_id = v_workout_id
      WHERE id = p_program_session_id
        AND program_id = v_program_id
        AND archived_at IS NULL
        AND status IN ('planned', 'in_progress')
      RETURNING id INTO v_updated_id;

      IF v_updated_id IS NULL THEN
        RAISE EXCEPTION 'PT-programøkta kunne ikkje fullførast. Ingen delvis lagring er gjort.';
      END IF;
    ELSE
      RAISE EXCEPTION 'PT-programøkta har ein status som ikkje kan fullførast.';
    END IF;
  END IF;

  RETURN v_workout_id;
END;
$function$
;
create trigger pt_program_coach_update_guard before update on public.pt_programs for each row execute function public.guard_pt_program_coach_update();
create trigger pt_guard_member_program_session_update before update on public.pt_program_sessions for each row execute function public.pt_guard_member_program_session_update();
create trigger pt_program_session_single_workout_log before insert or update on public.pt_program_sessions for each row execute function public.guard_single_pt_workout_log_link();
create trigger pt_session_archive_guard before update on public.pt_program_sessions for each row execute function public.guard_pt_session_archive_fields();
create trigger assignment_single_log before insert or update on public.pt_wod_assignments for each row execute function public.guard_single_pt_workout_log_link();
insert into public.profiles(id,role) values('00000000-0000-4000-8000-000000000001','member'),('00000000-0000-4000-8000-000000000002','member'),('00000000-0000-4000-8000-000000000003','member'),('00000000-0000-4000-8000-000000000004','admin');
insert into app_private.coaching values('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001');
insert into public.pt_programs(id,client_id,title,created_by) values('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Synthetic legacy plan','00000000-0000-4000-8000-000000000002');
insert into public.pt_program_sessions(id,program_id,sequence_no,title,wod_id,week_no,day_no) values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1,'A','30000000-0000-4000-8000-000000000001',1,1),('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',2,'B','30000000-0000-4000-8000-000000000001',1,2);
insert into public.pt_wod_assignments(id,member_id,wod_id) values('50000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');
