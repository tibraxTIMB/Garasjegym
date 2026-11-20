-- Consolidate overlapping authenticated RLS policies without changing access semantics.
-- SELECT predicates are OR-combined with staff access; ALL policies are split
-- into equivalent INSERT/UPDATE/DELETE policies. UPDATE predicates are OR-combined.
DO $$
DECLARE
  v_table text;
  v_select_using text;
  v_all_using text;
  v_all_check text;
  v_name text;
  r record;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'coffee_order_items','coffee_products','coffee_settings','daily_wod',
    'exercises','pt_session_exercises','training_session_wods',
    'wod_daily_schedules','wods'
  ] LOOP
    SELECT string_agg('(' || pg_get_expr(p.polqual,p.polrelid) || ')',' OR ')
      INTO v_select_using
    FROM pg_policy p
    JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=v_table
      AND p.polcmd='r' AND p.polpermissive
      AND p.polroles=ARRAY['authenticated'::regrole::oid];

    SELECT pg_get_expr(p.polqual,p.polrelid), pg_get_expr(p.polwithcheck,p.polrelid)
      INTO v_all_using,v_all_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid=p.polrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=v_table
      AND p.polcmd='*' AND p.polpermissive
      AND p.polroles=ARRAY['authenticated'::regrole::oid];

    IF v_select_using IS NULL OR v_all_using IS NULL OR v_all_check IS NULL THEN
      RAISE EXCEPTION 'Unexpected policy layout on public.%; aborting safely',v_table;
    END IF;

    v_name := v_table || '_read_combined';
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',v_name,v_table);
    FOR r IN
      SELECT p.polname
      FROM pg_policy p
      JOIN pg_class c ON c.oid=p.polrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=v_table
        AND p.polcmd IN ('r','*') AND p.polpermissive
        AND p.polroles=ARRAY['authenticated'::regrole::oid]
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',r.polname,v_table);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO authenticated USING ((%s) OR (%s))',
      v_name,v_table,v_select_using,v_all_using
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (%s)',
      v_table || '_staff_insert',v_table,v_all_check
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      v_table || '_staff_update',v_table,v_all_using,v_all_check
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR DELETE TO authenticated USING (%s)',
      v_table || '_staff_delete',v_table,v_all_using
    );
  END LOOP;

  SELECT string_agg('(' || pg_get_expr(p.polqual,p.polrelid) || ')',' OR '),
         string_agg('(' || pg_get_expr(p.polwithcheck,p.polrelid) || ')',' OR ')
    INTO v_select_using,v_all_check
  FROM pg_policy p
  JOIN pg_class c ON c.oid=p.polrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='pt_service_requests'
    AND p.polcmd='w' AND p.polpermissive
    AND p.polroles=ARRAY['authenticated'::regrole::oid]
    AND p.polname IN ('pt_service_requests_member_cancel','pt_service_requests_staff_update');

  IF v_select_using IS NULL OR v_all_check IS NULL THEN
    RAISE EXCEPTION 'Unexpected UPDATE policy layout on pt_service_requests; aborting safely';
  END IF;

  DROP POLICY IF EXISTS pt_service_requests_update_combined ON public.pt_service_requests;
  DROP POLICY pt_service_requests_member_cancel ON public.pt_service_requests;
  DROP POLICY pt_service_requests_staff_update ON public.pt_service_requests;
  EXECUTE format(
    'CREATE POLICY pt_service_requests_update_combined ON public.pt_service_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
    v_select_using,v_all_check
  );
END $$;
