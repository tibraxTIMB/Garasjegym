-- Assigned PT coach access. Coaches remain ordinary approved members; access is
-- derived from an active coach record and an active client assignment, never a role claim.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;

CREATE OR REPLACE FUNCTION app_private.is_pt_coach_for_member(p_member_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog','public','app_private'
AS $function$
  SELECT auth.uid() IS NOT NULL
     AND public.is_active_user()
     AND p_member_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.pt_client_assignments a
       JOIN public.pt_coaches c ON c.user_id=a.coach_user_id AND c.is_active
       JOIN public.profiles cp ON cp.id=c.user_id
       JOIN public.profiles mp ON mp.id=a.member_id
       WHERE a.coach_user_id=auth.uid() AND a.member_id=p_member_id
         AND a.status='active'
         AND cp.active AND cp.membership_status='approved'
         AND mp.active AND mp.membership_status='approved'
     );
$function$;
REVOKE ALL ON FUNCTION app_private.is_pt_coach_for_member(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_private.is_pt_coach_for_member(uuid) TO authenticated;
CREATE INDEX IF NOT EXISTS pt_client_assignments_active_coach_member_idx
  ON public.pt_client_assignments(coach_user_id,member_id) WHERE status='active';

-- Customer profiles and PT programmes.
DROP POLICY IF EXISTS profiles_read_assigned_pt_clients ON public.profiles;
CREATE POLICY profiles_read_assigned_pt_clients ON public.profiles
  FOR SELECT TO authenticated USING (app_private.is_pt_coach_for_member(id));

DROP POLICY IF EXISTS pt_programs_read_assigned_coach ON public.pt_programs;
CREATE POLICY pt_programs_read_assigned_coach ON public.pt_programs
  FOR SELECT TO authenticated USING (app_private.is_pt_coach_for_member(client_id));
DROP POLICY IF EXISTS pt_programs_insert_assigned_coach ON public.pt_programs;
CREATE POLICY pt_programs_insert_assigned_coach ON public.pt_programs
  FOR INSERT TO authenticated WITH CHECK (
    public.is_active_user() AND created_by=auth.uid()
    AND app_private.is_pt_coach_for_member(client_id)
  );
DROP POLICY IF EXISTS pt_programs_update_assigned_coach ON public.pt_programs;
CREATE POLICY pt_programs_update_assigned_coach ON public.pt_programs
  FOR UPDATE TO authenticated USING (app_private.is_pt_coach_for_member(client_id))
  WITH CHECK (app_private.is_pt_coach_for_member(client_id));

DROP POLICY IF EXISTS pt_program_sessions_read_assigned_coach ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_read_assigned_coach ON public.pt_program_sessions
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.pt_programs p
    WHERE p.id=pt_program_sessions.program_id
      AND app_private.is_pt_coach_for_member(p.client_id)
  ));
DROP POLICY IF EXISTS pt_program_sessions_insert_assigned_coach ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_insert_assigned_coach ON public.pt_program_sessions
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.pt_programs p
    WHERE p.id=pt_program_sessions.program_id AND p.archived_at IS NULL
      AND app_private.is_pt_coach_for_member(p.client_id)
  ));
DROP POLICY IF EXISTS pt_program_sessions_update_assigned_coach ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_update_assigned_coach ON public.pt_program_sessions
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.pt_programs p
    WHERE p.id=pt_program_sessions.program_id
      AND app_private.is_pt_coach_for_member(p.client_id)
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.pt_programs p
    WHERE p.id=pt_program_sessions.program_id
      AND app_private.is_pt_coach_for_member(p.client_id)
  ));

-- Member goals, intake forms and check-ins.
DROP POLICY IF EXISTS pt_client_goals_read_assigned_coach ON public.pt_client_goals;
CREATE POLICY pt_client_goals_read_assigned_coach ON public.pt_client_goals
  FOR SELECT TO authenticated USING (app_private.is_pt_coach_for_member(member_id));
DROP POLICY IF EXISTS pt_client_goals_insert_assigned_coach ON public.pt_client_goals;
CREATE POLICY pt_client_goals_insert_assigned_coach ON public.pt_client_goals
  FOR INSERT TO authenticated WITH CHECK (
    created_by=auth.uid() AND app_private.is_pt_coach_for_member(member_id)
  );
DROP POLICY IF EXISTS pt_client_goals_update_assigned_coach ON public.pt_client_goals;
CREATE POLICY pt_client_goals_update_assigned_coach ON public.pt_client_goals
  FOR UPDATE TO authenticated USING (app_private.is_pt_coach_for_member(member_id))
  WITH CHECK (app_private.is_pt_coach_for_member(member_id));
DROP POLICY IF EXISTS pt_client_goals_delete_assigned_coach ON public.pt_client_goals;
CREATE POLICY pt_client_goals_delete_assigned_coach ON public.pt_client_goals
  FOR DELETE TO authenticated USING (app_private.is_pt_coach_for_member(member_id));

DROP POLICY IF EXISTS pt_intakes_read_assigned_coach ON public.pt_intakes;
CREATE POLICY pt_intakes_read_assigned_coach ON public.pt_intakes
  FOR SELECT TO authenticated USING (app_private.is_pt_coach_for_member(member_id));
DROP POLICY IF EXISTS pt_intakes_update_assigned_coach ON public.pt_intakes;
CREATE POLICY pt_intakes_update_assigned_coach ON public.pt_intakes
  FOR UPDATE TO authenticated USING (app_private.is_pt_coach_for_member(member_id))
  WITH CHECK (app_private.is_pt_coach_for_member(member_id));

DROP POLICY IF EXISTS pt_checkins_read_assigned_coach ON public.pt_checkins;
CREATE POLICY pt_checkins_read_assigned_coach ON public.pt_checkins
  FOR SELECT TO authenticated USING (app_private.is_pt_coach_for_member(member_id));
DROP POLICY IF EXISTS pt_checkins_insert_assigned_coach ON public.pt_checkins;
CREATE POLICY pt_checkins_insert_assigned_coach ON public.pt_checkins
  FOR INSERT TO authenticated WITH CHECK (
    created_by=auth.uid() AND app_private.is_pt_coach_for_member(member_id)
    AND status='pending'
  );
DROP POLICY IF EXISTS pt_checkins_update_assigned_coach ON public.pt_checkins;
CREATE POLICY pt_checkins_update_assigned_coach ON public.pt_checkins
  FOR UPDATE TO authenticated USING (app_private.is_pt_coach_for_member(member_id))
  WITH CHECK (app_private.is_pt_coach_for_member(member_id));

-- Private trainer notes and coach/member conversation.
DROP POLICY IF EXISTS pt_client_notes_assigned_coach_all ON public.pt_client_notes;
CREATE POLICY pt_client_notes_assigned_coach_all ON public.pt_client_notes
  FOR ALL TO authenticated
  USING (coach_id=auth.uid() AND app_private.is_pt_coach_for_member(client_id))
  WITH CHECK (coach_id=auth.uid() AND app_private.is_pt_coach_for_member(client_id));

DROP POLICY IF EXISTS pt_messages_read_assigned_coach ON public.pt_messages;
CREATE POLICY pt_messages_read_assigned_coach ON public.pt_messages
  FOR SELECT TO authenticated USING (app_private.is_pt_coach_for_member(client_id));
DROP POLICY IF EXISTS pt_messages_insert_assigned_coach ON public.pt_messages;
CREATE POLICY pt_messages_insert_assigned_coach ON public.pt_messages
  FOR INSERT TO authenticated WITH CHECK (
    is_active_user() AND sender_id=auth.uid()
    AND app_private.is_pt_coach_for_member(client_id)
  );
DROP POLICY IF EXISTS pt_messages_delete_assigned_coach ON public.pt_messages;
CREATE POLICY pt_messages_delete_assigned_coach ON public.pt_messages
  FOR DELETE TO authenticated USING (
    sender_id=auth.uid() AND app_private.is_pt_coach_for_member(client_id)
  );

-- Coach-specific PT requests.
DROP POLICY IF EXISTS pt_requests_read_assigned_coach ON public.pt_requests;
CREATE POLICY pt_requests_read_assigned_coach ON public.pt_requests
  FOR SELECT TO authenticated USING (app_private.is_pt_coach_for_member(member_id));
DROP POLICY IF EXISTS pt_requests_update_assigned_coach ON public.pt_requests;
CREATE POLICY pt_requests_update_assigned_coach ON public.pt_requests
  FOR UPDATE TO authenticated USING (app_private.is_pt_coach_for_member(member_id))
  WITH CHECK (app_private.is_pt_coach_for_member(member_id));

DROP POLICY IF EXISTS pt_service_requests_update_assigned_coach ON public.pt_service_requests;
CREATE POLICY pt_service_requests_update_assigned_coach ON public.pt_service_requests
  FOR UPDATE TO authenticated
  USING (assigned_coach_id=auth.uid() AND app_private.is_pt_coach_for_member(member_id))
  WITH CHECK (
    assigned_coach_id=auth.uid() AND app_private.is_pt_coach_for_member(member_id)
    AND handled_by=auth.uid()
  );

-- Legacy PT sessions, exercises and bookings.
DROP POLICY IF EXISTS pt_sessions_read_assigned_coach ON public.pt_sessions;
CREATE POLICY pt_sessions_read_assigned_coach ON public.pt_sessions
  FOR SELECT TO authenticated USING (
    client_id IS NOT NULL AND app_private.is_pt_coach_for_member(client_id)
  );
DROP POLICY IF EXISTS pt_sessions_insert_assigned_coach ON public.pt_sessions;
CREATE POLICY pt_sessions_insert_assigned_coach ON public.pt_sessions
  FOR INSERT TO authenticated WITH CHECK (
    created_by=auth.uid() AND client_id IS NOT NULL
    AND app_private.is_pt_coach_for_member(client_id)
  );
DROP POLICY IF EXISTS pt_sessions_update_assigned_coach ON public.pt_sessions;
CREATE POLICY pt_sessions_update_assigned_coach ON public.pt_sessions
  FOR UPDATE TO authenticated
  USING (client_id IS NOT NULL AND app_private.is_pt_coach_for_member(client_id))
  WITH CHECK (client_id IS NOT NULL AND app_private.is_pt_coach_for_member(client_id));

DROP POLICY IF EXISTS pt_session_exercises_read_assigned_coach ON public.pt_session_exercises;
CREATE POLICY pt_session_exercises_read_assigned_coach ON public.pt_session_exercises
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.pt_sessions s
    WHERE s.id=pt_session_exercises.session_id AND s.client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(s.client_id)
  ));
DROP POLICY IF EXISTS pt_session_exercises_insert_assigned_coach ON public.pt_session_exercises;
CREATE POLICY pt_session_exercises_insert_assigned_coach ON public.pt_session_exercises
  FOR INSERT TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM public.pt_sessions s
    WHERE s.id=pt_session_exercises.session_id AND s.client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(s.client_id)
  ));
DROP POLICY IF EXISTS pt_session_exercises_update_assigned_coach ON public.pt_session_exercises;
CREATE POLICY pt_session_exercises_update_assigned_coach ON public.pt_session_exercises
  FOR UPDATE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.pt_sessions s
    WHERE s.id=pt_session_exercises.session_id AND s.client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(s.client_id)
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.pt_sessions s
    WHERE s.id=pt_session_exercises.session_id AND s.client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(s.client_id)
  ));
DROP POLICY IF EXISTS pt_session_exercises_delete_assigned_coach ON public.pt_session_exercises;
CREATE POLICY pt_session_exercises_delete_assigned_coach ON public.pt_session_exercises
  FOR DELETE TO authenticated USING (EXISTS (
    SELECT 1 FROM public.pt_sessions s
    WHERE s.id=pt_session_exercises.session_id AND s.client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(s.client_id)
  ));

DROP POLICY IF EXISTS pt_bookings_read_assigned_coach ON public.pt_bookings;
CREATE POLICY pt_bookings_read_assigned_coach ON public.pt_bookings
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.pt_sessions s
    WHERE s.id=pt_bookings.session_id AND s.client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(s.client_id)
  ));

-- Assigned PTs may work with WODs and assignments for their own clients.
DROP POLICY IF EXISTS pt_wod_assignments_read_assigned_coach ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_read_assigned_coach ON public.pt_wod_assignments
  FOR SELECT TO authenticated USING (app_private.is_pt_coach_for_member(member_id));
DROP POLICY IF EXISTS pt_wod_assignments_insert_assigned_coach ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_insert_assigned_coach ON public.pt_wod_assignments
  FOR INSERT TO authenticated WITH CHECK (
    assigned_by=auth.uid() AND app_private.is_pt_coach_for_member(member_id)
  );
DROP POLICY IF EXISTS pt_wod_assignments_update_assigned_coach ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_update_assigned_coach ON public.pt_wod_assignments
  FOR UPDATE TO authenticated USING (app_private.is_pt_coach_for_member(member_id))
  WITH CHECK (app_private.is_pt_coach_for_member(member_id));

DROP POLICY IF EXISTS wods_read_own_pt_library ON public.wods;
CREATE POLICY wods_read_own_pt_library ON public.wods
  FOR SELECT TO authenticated USING (
    created_by=auth.uid()
    AND EXISTS (SELECT 1 FROM public.pt_coaches c
      WHERE c.user_id=auth.uid() AND c.is_active=true)
  );

-- Guard programme ownership and archive metadata.
CREATE OR REPLACE FUNCTION public.guard_pt_program_coach_update()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public','app_private'
AS $function$
BEGIN
  IF public.is_admin_or_manager() THEN RETURN NEW; END IF;
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
    RAISE EXCEPTION 'Arkivering og programstatus må endrast gjennom godkjende funksjonar.';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS pt_program_coach_update_guard ON public.pt_programs;
CREATE TRIGGER pt_program_coach_update_guard BEFORE UPDATE ON public.pt_programs
FOR EACH ROW EXECUTE FUNCTION public.guard_pt_program_coach_update();

-- PT edits programme structure; only the member may complete a session and link a workout.
CREATE OR REPLACE FUNCTION public.pt_guard_member_program_session_update()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public','app_private'
AS $function$
DECLARE v_client_id uuid;
BEGIN
  IF public.is_admin_or_manager() THEN RETURN NEW; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.program_id IS DISTINCT FROM OLD.program_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'PT-øktas identitet og programtilhøyrsle kan ikkje endrast.';
  END IF;
  SELECT p.client_id INTO v_client_id FROM public.pt_programs p WHERE p.id=OLD.program_id;
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
    WHERE wl.id=NEW.workout_log_id AND wl.member_id=(SELECT auth.uid())
      AND wl.source_wod_id IS NOT DISTINCT FROM OLD.wod_id
  ) THEN
    RAISE EXCEPTION 'PT-økta kan berre koplast til di eiga treningsøkt for rett WOD.';
  END IF;
  IF NEW.status='completed' AND NEW.workout_log_id IS NULL THEN
    RAISE EXCEPTION 'PT-økta kan berre fullførast saman med ei lagra treningsøkt.';
  END IF;
  IF NEW.workout_log_id IS DISTINCT FROM OLD.workout_log_id AND NEW.status<>'completed' THEN
    RAISE EXCEPTION 'Treningslogg kan berre koplast til ei fullført PT-økt.';
  END IF;
  IF NEW.status='completed' THEN NEW.completed_at:=coalesce(OLD.completed_at,now());
  ELSE NEW.completed_at:=NULL; END IF;
  NEW.updated_at:=now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_pt_session_archive_fields()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public','app_private'
AS $function$
DECLARE v_client_id uuid;
BEGIN
  IF public.is_admin_or_manager() THEN RETURN NEW; END IF;
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at
     OR NEW.archived_by IS DISTINCT FROM OLD.archived_by THEN
    SELECT p.client_id INTO v_client_id FROM public.pt_programs p WHERE p.id=OLD.program_id;
    IF current_user='authenticated' OR NOT app_private.is_pt_coach_for_member(v_client_id) THEN
      RAISE EXCEPTION 'Berre PT-en som er tildelt kunden eller administrator kan arkivera PT-økter.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_pt_legacy_session_update()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public','app_private'
AS $function$
BEGIN
  IF public.is_admin_or_manager() THEN RETURN NEW; END IF;
  IF NOT app_private.is_pt_coach_for_member(OLD.client_id) THEN
    RAISE EXCEPTION 'Berre tildelt PT kan endra denne PT-timen.';
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'Kunde og opprettar kan ikkje bytast på ein eksisterande PT-time.';
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS pt_legacy_session_update_guard ON public.pt_sessions;
CREATE TRIGGER pt_legacy_session_update_guard BEFORE UPDATE ON public.pt_sessions
FOR EACH ROW EXECUTE FUNCTION public.guard_pt_legacy_session_update();

-- Create PT programme only for an active approved client assigned to this coach.
CREATE OR REPLACE FUNCTION public.create_pt_program_with_sessions(p_program jsonb,p_sessions jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','app_private','pg_temp'
AS $function$
DECLARE
  v_program_id uuid; v_client_id uuid; v_session jsonb; v_index integer:=0;
  v_is_staff boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.'; END IF;
  v_is_staff:=public.is_admin_or_manager();
  IF jsonb_typeof(p_program)<>'object' THEN RAISE EXCEPTION 'Programdata er ugyldige.'; END IF;
  IF jsonb_typeof(p_sessions)<>'array' OR jsonb_array_length(p_sessions)=0 THEN
    RAISE EXCEPTION 'Programmet må innehalda minst éi økt eller eitt steg.';
  END IF;
  IF nullif(p_program->>'client_id','') IS NULL THEN RAISE EXCEPTION 'Programmet må ha ein kunde.'; END IF;
  v_client_id:=(p_program->>'client_id')::uuid;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=v_client_id AND p.active=true AND p.membership_status='approved') THEN
    RAISE EXCEPTION 'Kunden har ikkje ein aktiv og godkjend medlemskonto.';
  END IF;
  IF NOT v_is_staff AND NOT app_private.is_pt_coach_for_member(v_client_id) THEN
    RAISE EXCEPTION 'Du kan berre oppretta program for kundar som er tildelte deg.';
  END IF;
  IF nullif(btrim(p_program->>'title'),'') IS NULL THEN RAISE EXCEPTION 'Programmet må ha namn.'; END IF;
  IF coalesce(nullif(p_program->>'program_type',''),'intro') NOT IN ('intro','course','training_plan','progression') THEN
    RAISE EXCEPTION 'Ugyldig programtype.';
  END IF;
  IF nullif(p_program->>'template_id','') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.pt_program_templates t
    WHERE t.id=(p_program->>'template_id')::uuid AND t.is_active=true
  ) THEN RAISE EXCEPTION 'Programmalen er ikkje lenger aktiv.'; END IF;
  INSERT INTO public.pt_programs(
    client_id,template_id,title,description,start_date,weeks,focus_areas,status,created_by,coach_notes,program_type
  ) VALUES (
    v_client_id,nullif(p_program->>'template_id','')::uuid,btrim(p_program->>'title'),
    coalesce(p_program->>'description',''),nullif(p_program->>'start_date','')::date,
    greatest(1,least(52,coalesce(nullif(p_program->>'weeks','')::integer,6))),
    CASE WHEN jsonb_typeof(p_program->'focus_areas')='array'
      THEN ARRAY(SELECT jsonb_array_elements_text(p_program->'focus_areas')) ELSE '{}'::text[] END,
    'active',auth.uid(),coalesce(p_program->>'coach_notes',''),
    coalesce(nullif(p_program->>'program_type',''),'intro')
  ) RETURNING id INTO v_program_id;
  FOR v_session IN SELECT value FROM jsonb_array_elements(p_sessions) LOOP
    v_index:=v_index+1;
    IF nullif(btrim(v_session->>'title'),'') IS NULL THEN
      RAISE EXCEPTION 'Programsteg nummer % manglar namn.',v_index;
    END IF;
    INSERT INTO public.pt_program_sessions(
      program_id,sequence_no,title,wod_id,scheduled_date,workout_snapshot,coach_note,
      status,week_no,day_no,session_kind,focus_area,estimated_minutes
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
$function$;

-- Archive/restore operations permit the assigned PT and keep child archive timestamps linked.
CREATE OR REPLACE FUNCTION public.archive_pt_program(p_program_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','app_private','pg_temp'
AS $function$
DECLARE v_archived_at timestamptz; v_status text; v_client_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.'; END IF;
  SELECT client_id,archived_at,status INTO v_client_id,v_archived_at,v_status
  FROM public.pt_programs WHERE id=p_program_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT-programmet finst ikkje.'; END IF;
  IF NOT public.is_admin_or_manager() AND NOT app_private.is_pt_coach_for_member(v_client_id) THEN
    RAISE EXCEPTION 'Berre administrator eller tildelt PT kan arkivera programmet.';
  END IF;
  IF v_archived_at IS NOT NULL THEN RAISE EXCEPTION 'PT-programmet er allereie arkivert.'; END IF;
  v_archived_at:=now();
  UPDATE public.pt_programs SET archived_at=v_archived_at,archived_by=auth.uid(),
    archived_previous_status=v_status,status='paused',updated_at=now() WHERE id=p_program_id;
  UPDATE public.pt_program_sessions SET archived_at=v_archived_at,archived_by=auth.uid(),updated_at=now()
    WHERE program_id=p_program_id AND archived_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_pt_program(p_program_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','app_private','pg_temp'
AS $function$
DECLARE v_archived_at timestamptz; v_previous_status text; v_client_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.'; END IF;
  SELECT client_id,archived_at,archived_previous_status INTO v_client_id,v_archived_at,v_previous_status
  FROM public.pt_programs WHERE id=p_program_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT-programmet finst ikkje.'; END IF;
  IF NOT public.is_admin_or_manager() AND NOT app_private.is_pt_coach_for_member(v_client_id) THEN
    RAISE EXCEPTION 'Berre administrator eller tildelt PT kan gjenoppretta programmet.';
  END IF;
  IF v_archived_at IS NULL THEN RAISE EXCEPTION 'PT-programmet er ikkje arkivert.'; END IF;
  UPDATE public.pt_programs SET archived_at=NULL,archived_by=NULL,
    status=coalesce(v_previous_status,'active'),archived_previous_status=NULL,updated_at=now()
    WHERE id=p_program_id;
  UPDATE public.pt_program_sessions SET archived_at=NULL,archived_by=NULL,updated_at=now()
    WHERE program_id=p_program_id AND archived_at=v_archived_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_pt_program_session(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','app_private','pg_temp'
AS $function$
DECLARE v_program_id uuid; v_client_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.'; END IF;
  SELECT program_id INTO v_program_id FROM public.pt_program_sessions WHERE id=p_session_id;
  IF v_program_id IS NULL THEN RAISE EXCEPTION 'PT-økta finst ikkje.'; END IF;
  SELECT client_id INTO v_client_id FROM public.pt_programs
    WHERE id=v_program_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Programmet er arkivert.'; END IF;
  IF NOT public.is_admin_or_manager() AND NOT app_private.is_pt_coach_for_member(v_client_id) THEN
    RAISE EXCEPTION 'Berre administrator eller tildelt PT kan arkivera økta.';
  END IF;
  PERFORM 1 FROM public.pt_program_sessions
    WHERE id=p_session_id AND program_id=v_program_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT-økta er allereie arkivert.'; END IF;
  UPDATE public.pt_program_sessions SET archived_at=now(),archived_by=auth.uid(),updated_at=now()
    WHERE id=p_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_pt_program_session(p_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','app_private','pg_temp'
AS $function$
DECLARE v_program_id uuid; v_client_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.'; END IF;
  SELECT program_id INTO v_program_id FROM public.pt_program_sessions WHERE id=p_session_id;
  IF v_program_id IS NULL THEN RAISE EXCEPTION 'PT-økta finst ikkje.'; END IF;
  SELECT client_id INTO v_client_id FROM public.pt_programs
    WHERE id=v_program_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gjenopprett programmet før du gjenopprettar økta.'; END IF;
  IF NOT public.is_admin_or_manager() AND NOT app_private.is_pt_coach_for_member(v_client_id) THEN
    RAISE EXCEPTION 'Berre administrator eller tildelt PT kan gjenoppretta økta.';
  END IF;
  PERFORM 1 FROM public.pt_program_sessions
    WHERE id=p_session_id AND program_id=v_program_id AND archived_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT-økta er ikkje arkivert.'; END IF;
  UPDATE public.pt_program_sessions SET archived_at=NULL,archived_by=NULL,updated_at=now()
    WHERE id=p_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_pt_program_session(p_session_id uuid,p_week_no integer,p_day_no integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','app_private','pg_temp'
AS $function$
DECLARE v_program_id uuid; v_client_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.'; END IF;
  IF p_session_id IS NULL OR p_week_no IS NULL OR p_week_no<1 OR p_week_no>52
     OR p_day_no IS NULL OR p_day_no<1 OR p_day_no>7 THEN
    RAISE EXCEPTION 'Ugyldig veke eller dag. Veke må vere 1–52 og dag 1–7.';
  END IF;
  SELECT program_id INTO v_program_id FROM public.pt_program_sessions
    WHERE id=p_session_id AND archived_at IS NULL;
  IF v_program_id IS NULL THEN RAISE EXCEPTION 'Aktiv PT-økt vart ikkje funnen.'; END IF;
  SELECT client_id INTO v_client_id FROM public.pt_programs
    WHERE id=v_program_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT-programmet er arkivert eller finst ikkje.'; END IF;
  IF NOT public.is_admin_or_manager() AND NOT app_private.is_pt_coach_for_member(v_client_id) THEN
    RAISE EXCEPTION 'Berre administrator eller tildelt PT kan flytta programøkta.';
  END IF;
  PERFORM 1 FROM public.pt_program_sessions
    WHERE id=p_session_id AND program_id=v_program_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT-økta vart endra eller arkivert. Last sida på nytt.'; END IF;
  UPDATE public.pt_program_sessions SET week_no=p_week_no,day_no=p_day_no,updated_at=now()
    WHERE id=p_session_id AND program_id=v_program_id AND archived_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reorder_pt_program_sessions(p_session_id uuid,p_target_session_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','app_private','pg_temp'
AS $function$
DECLARE v_program_id uuid; v_client_id uuid;
  v_first public.pt_program_sessions%rowtype; v_second public.pt_program_sessions%rowtype;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.'; END IF;
  IF p_session_id IS NULL OR p_target_session_id IS NULL OR p_session_id=p_target_session_id THEN
    RAISE EXCEPTION 'Ugyldig øktval for omorganisering.';
  END IF;
  SELECT program_id INTO v_program_id FROM public.pt_program_sessions
    WHERE id=p_session_id AND archived_at IS NULL;
  IF v_program_id IS NULL THEN RAISE EXCEPTION 'Aktiv PT-økt finst ikkje.'; END IF;
  SELECT client_id INTO v_client_id FROM public.pt_programs
    WHERE id=v_program_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PT-programmet er arkivert eller finst ikkje.'; END IF;
  IF NOT public.is_admin_or_manager() AND NOT app_private.is_pt_coach_for_member(v_client_id) THEN
    RAISE EXCEPTION 'Berre administrator eller tildelt PT kan endra rekkjefølgja.';
  END IF;
  PERFORM id FROM public.pt_program_sessions
    WHERE id IN (p_session_id,p_target_session_id)
      AND program_id=v_program_id AND archived_at IS NULL
    ORDER BY id FOR UPDATE;
  SELECT * INTO v_first FROM public.pt_program_sessions
    WHERE id=p_session_id AND program_id=v_program_id AND archived_at IS NULL;
  SELECT * INTO v_second FROM public.pt_program_sessions
    WHERE id=p_target_session_id AND program_id=v_program_id AND archived_at IS NULL;
  IF v_first.id IS NULL OR v_second.id IS NULL THEN
    RAISE EXCEPTION 'Begge øktene må vere aktive og høyra til same PT-program.';
  END IF;
  UPDATE public.pt_program_sessions SET sequence_no=-1 WHERE id=v_first.id;
  UPDATE public.pt_program_sessions SET sequence_no=v_first.sequence_no,
    week_no=v_first.week_no,day_no=v_first.day_no,updated_at=now() WHERE id=v_second.id;
  UPDATE public.pt_program_sessions SET sequence_no=v_second.sequence_no,
    week_no=v_second.week_no,day_no=v_second.day_no,updated_at=now() WHERE id=v_first.id;
END;
$function$;

-- Coaches can create and update only their own private PT WODs. Publishing remains admin-only.
CREATE OR REPLACE FUNCTION public.save_wod_with_pt_assignment(p_wod jsonb,p_member_id uuid,p_wod_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public','app_private'
AS $function$
DECLARE
  v_user_id uuid:=auth.uid(); v_wod_id uuid;
  v_is_staff boolean; v_publish boolean;
BEGIN
  v_is_staff:=public.is_admin_or_manager();
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN RAISE EXCEPTION 'Ei aktiv medlemskonto krevst.'; END IF;
  IF jsonb_typeof(p_wod)<>'object' OR nullif(btrim(p_wod->>'name'),'') IS NULL OR p_member_id IS NULL THEN
    RAISE EXCEPTION 'WOD og kunde må vera gyldig valde.';
  END IF;
  IF NOT v_is_staff AND NOT app_private.is_pt_coach_for_member(p_member_id) THEN
    RAISE EXCEPTION 'Du kan berre tildela WOD til kundar som er tildelte deg.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id=p_member_id AND p.active=true AND p.membership_status='approved') THEN
    RAISE EXCEPTION 'Kunden har ikkje ein aktiv og godkjend medlemskonto.';
  END IF;
  v_publish:=CASE WHEN v_is_staff THEN coalesce((p_wod->>'is_published')::boolean,false) ELSE false END;
  IF p_wod_id IS NULL THEN
    INSERT INTO public.wods(name,category,format,duration_minutes,movements,notes,is_published,created_by,timer_settings)
    VALUES (
      btrim(p_wod->>'name'),coalesce(nullif(p_wod->>'category',''),'main'),
      coalesce(nullif(p_wod->>'format',''),'Eigen økt'),
      nullif(p_wod->>'duration_minutes','')::integer,coalesce(p_wod->>'movements',''),
      coalesce(p_wod->>'notes',''),v_publish,v_user_id,
      CASE WHEN jsonb_typeof(p_wod->'timer_settings')='object' THEN p_wod->'timer_settings' ELSE '{}'::jsonb END
    ) RETURNING id INTO v_wod_id;
  ELSE
    IF NOT v_is_staff AND NOT EXISTS (
      SELECT 1 FROM public.wods w WHERE w.id=p_wod_id AND w.created_by=v_user_id
    ) THEN RAISE EXCEPTION 'Du kan berre redigera WOD-ar du sjølv har oppretta.'; END IF;
    UPDATE public.wods SET
      name=btrim(p_wod->>'name'),category=coalesce(nullif(p_wod->>'category',''),'main'),
      format=coalesce(nullif(p_wod->>'format',''),'Eigen økt'),
      duration_minutes=nullif(p_wod->>'duration_minutes','')::integer,
      movements=coalesce(p_wod->>'movements',''),notes=coalesce(p_wod->>'notes',''),
      is_published=v_publish,
      timer_settings=CASE WHEN jsonb_typeof(p_wod->'timer_settings')='object' THEN p_wod->'timer_settings' ELSE '{}'::jsonb END,
      updated_at=now()
    WHERE id=p_wod_id RETURNING id INTO v_wod_id;
    IF v_wod_id IS NULL THEN RAISE EXCEPTION 'WOD-en finst ikkje eller kan ikkje redigerast.'; END IF;
  END IF;
  INSERT INTO public.pt_wod_assignments(member_id,wod_id,assigned_by,location,coach_note,status)
  VALUES (p_member_id,v_wod_id,v_user_id,'Valfritt','Tildelt frå PT Studio','assigned');
  RETURN v_wod_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_pt_program_with_sessions(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_pt_program_with_sessions(jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.archive_pt_program(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.archive_pt_program(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.restore_pt_program(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.restore_pt_program(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.archive_pt_program_session(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.archive_pt_program_session(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.restore_pt_program_session(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.restore_pt_program_session(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.move_pt_program_session(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.move_pt_program_session(uuid,integer,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.reorder_pt_program_sessions(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reorder_pt_program_sessions(uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.save_wod_with_pt_assignment(jsonb,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_wod_with_pt_assignment(jsonb,uuid,uuid) TO authenticated;
