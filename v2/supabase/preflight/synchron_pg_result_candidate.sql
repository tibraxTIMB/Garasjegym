-- CANDIDATE ONLY. Existing generic save_workout_atomic requires nonempty exercises.
-- This server-only path intentionally writes no exercise/set rows or personal scores.
CREATE FUNCTION gg_synchron_private.save_own_result(a uuid,sid uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE s jsonb; rev bigint; entry jsonb; n integer; p jsonb; token uuid; log_id uuid;
 existing jsonb; saved_before boolean; next_state jsonb; k text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('gg-synchron-private-v1',0));
 SELECT x.state,x.revision INTO s,rev FROM gg_synchron_private.sessions x WHERE x.id=sid FOR UPDATE;
 IF NOT FOUND OR s->>'phase' IS DISTINCT FROM 'finished' OR jsonb_typeof(s#>'{seal,entries}') IS DISTINCT FROM 'array'
 OR NOT (s#>'{plan,members}' ? a::text) THEN RETURN NULL; END IF;
 PERFORM gg_synchron_private.lock_permissions(s);
 IF NOT gg_synchron_private.authorized(a,s) OR ((s#>'{review,approved}') @> (s#>'{plan,members}')) IS DISTINCT FROM true THEN RETURN NULL; END IF;
 SELECT value,ordinality::int-1 INTO entry,n FROM jsonb_array_elements(s#>'{seal,entries}') WITH ORDINALITY AS e(value,ordinality) WHERE value->>'memberId'=a::text;
 IF NOT FOUND OR entry->>'sessionId' IS DISTINCT FROM sid::text THEN RETURN NULL; END IF;
 p:=entry->'payload'; token:=(entry->>'saveToken')::uuid;
 IF token IS NULL OR p->>'save_token' IS DISTINCT FROM token::text OR p->>'member_id' IS DISTINCT FROM a::text
 OR p->'exercises' IS DISTINCT FROM '[]'::jsonb OR p->>'format' IS DISTINCT FROM 'Chipper' OR p->'rounds' IS DISTINCT FROM '1'::jsonb
 OR p#>>'{result_data,participation_verified}' IS DISTINCT FROM 'team'
 OR p#>'{result_data,synchron_result,approved}' IS DISTINCT FROM 'true'::jsonb
 OR p#>'{result_data,synchron_result,pr_eligible}' IS DISTINCT FROM 'false'::jsonb
 OR p#>>'{result_data,synchron_result,session_id}' IS DISTINCT FROM sid::text
 OR p#>'{result_data,synchron_result,review_revision}' IS DISTINCT FROM s#>'{seal,reviewRevision}'
 THEN RETURN NULL; END IF;
 FOREACH k IN ARRAY ARRAY['source_wod_id','class_live_session_id','score_rounds','score_reps','score_time_seconds','score_load_kg','score_calories','score_distance','score_unit'] LOOP
  IF p->k IS DISTINCT FROM 'null'::jsonb THEN RETURN NULL; END IF;
 END LOOP;
 saved_before:=entry->'receipt' IS DISTINCT FROM 'null'::jsonb;
 IF saved_before THEN
  log_id:=(entry#>>'{receipt,workoutId}')::uuid;
  IF log_id IS NULL THEN RETURN NULL; END IF;
 ELSE
  -- Do not adopt an independently written log with a colliding token.
  IF EXISTS(SELECT 1 FROM public.workout_logs WHERE member_id=a AND save_token=token) THEN RETURN NULL; END IF;
  INSERT INTO public.workout_logs(member_id,save_token,title,workout_date,format,rounds,note,result_data)
   VALUES(a,token,p->>'title',(p->>'workout_date')::date,'Chipper',1,p->>'note',p->'result_data')
   RETURNING id INTO log_id;
 END IF;
 -- Verify all sealed fields against the actual row, not merely a returned ID.
 SELECT (SELECT jsonb_object_agg(j.key,j.value) FROM jsonb_each(to_jsonb(w)) j WHERE p ? j.key)
 INTO existing FROM public.workout_logs w WHERE w.id=log_id AND w.member_id=a AND w.save_token=token FOR SHARE;
 IF NOT FOUND OR existing IS DISTINCT FROM p-'exercises' THEN
  IF saved_before THEN RETURN NULL; ELSE RAISE EXCEPTION 'Sealed workout mismatch'; END IF;
 END IF;
 IF NOT saved_before THEN
  next_state:=jsonb_set(s,ARRAY['seal','entries',n::text,'receipt'],jsonb_build_object('workoutId',log_id),false);
  next_state:=jsonb_set(next_state,'{revision}',to_jsonb(rev+1),false);
  UPDATE gg_synchron_private.sessions SET state=next_state,revision=rev+1 WHERE id=sid AND revision=rev;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receipt revision changed'; END IF;
 END IF;
 RETURN jsonb_build_object('saved',true,'workoutId',log_id,'duplicate',saved_before);
EXCEPTION WHEN unique_violation OR check_violation OR not_null_violation THEN RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION gg_synchron_private.save_own_result(uuid,uuid) FROM PUBLIC,anon,authenticated;
