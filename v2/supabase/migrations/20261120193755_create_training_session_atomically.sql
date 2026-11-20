CREATE OR REPLACE FUNCTION public.create_training_session_with_wods(
  p_name text,
  p_session_date date,
  p_wod_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_session_id uuid;
  v_wod_id uuid;
  v_sort_order integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Berre administrator eller dagleg leiar kan oppretta treningsøkter.';
  END IF;
  IF NULLIF(BTRIM(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'Treningsøkta må ha eit namn.';
  END IF;
  IF p_wod_ids IS NULL OR cardinality(p_wod_ids) = 0 THEN
    RAISE EXCEPTION 'Vel minst éin WOD til treningsøkta.';
  END IF;
  IF cardinality(p_wod_ids) <> (SELECT count(DISTINCT x) FROM unnest(p_wod_ids) AS x) THEN
    RAISE EXCEPTION 'Same WOD kan ikkje leggjast til fleire gonger i same økt.';
  END IF;
  INSERT INTO public.training_sessions(name, created_by, session_date)
  VALUES (BTRIM(p_name), auth.uid(), p_session_date)
  RETURNING id INTO v_session_id;
  FOREACH v_wod_id IN ARRAY p_wod_ids LOOP
    IF NOT EXISTS (SELECT 1 FROM public.wods w WHERE w.id=v_wod_id AND COALESCE(w.is_archived,false)=false) THEN
      RAISE EXCEPTION 'Ein av WOD-ane finst ikkje lenger eller er arkivert.';
    END IF;
    INSERT INTO public.training_session_wods(session_id,wod_id,sort_order)
    VALUES(v_session_id,v_wod_id,v_sort_order);
    v_sort_order:=v_sort_order+1;
  END LOOP;
  RETURN v_session_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_training_session_with_wods(text,date,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_training_session_with_wods(text,date,uuid[]) TO authenticated;