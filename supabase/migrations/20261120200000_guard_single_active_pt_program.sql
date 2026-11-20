-- A client has one active PT programme at a time. Archived and paused programmes
-- remain available in history and do not block a new active programme.
CREATE UNIQUE INDEX IF NOT EXISTS pt_programs_one_active_per_client_uidx
  ON public.pt_programs (client_id)
  WHERE status = 'active' AND archived_at IS NULL;

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

  -- Lock the member row so concurrent create requests for this client serialize.
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
    v_client_id,
    nullif(p_program->>'template_id','')::uuid,
    btrim(p_program->>'title'),
    coalesce(p_program->>'description',''),
    nullif(p_program->>'start_date','')::date,
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
      v_program_id,
      coalesce(nullif(v_session->>'sequence_no','')::integer,v_index),
      btrim(v_session->>'title'),
      nullif(v_session->>'wod_id','')::uuid,
      nullif(v_session->>'scheduled_date','')::date,
      CASE WHEN jsonb_typeof(v_session->'workout_snapshot')='object' THEN v_session->'workout_snapshot' ELSE '{}'::jsonb END,
      coalesce(v_session->>'coach_note',''),
      coalesce(nullif(v_session->>'status',''),'planned'),
      greatest(1,least(52,coalesce(nullif(v_session->>'week_no','')::integer,1))),
      greatest(1,least(7,coalesce(nullif(v_session->>'day_no','')::integer,1))),
      coalesce(nullif(v_session->>'session_kind',''),'training'),
      coalesce(v_session->>'focus_area',''),
      nullif(v_session->>'estimated_minutes','')::integer
    );
  END LOOP;
  RETURN v_program_id;
END;
$function$;
