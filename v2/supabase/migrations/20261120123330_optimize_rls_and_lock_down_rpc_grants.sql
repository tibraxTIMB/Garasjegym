
DO $$
DECLARE
  r record;
  v_using text;
  v_check text;
  v_cmd text;
  v_roles text;
  v_permissive text;
  v_stmt text;
BEGIN
  FOR r IN
    SELECT p.polrelid, p.polname, p.polcmd, p.polpermissive, p.polroles,
           pg_get_expr(p.polqual, p.polrelid) AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr,
           n.nspname, c.relname
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND (
        coalesce(pg_get_expr(p.polqual, p.polrelid), '') ~ 'auth\.(uid|jwt)\(\)|current_setting\('
        OR coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ 'auth\.(uid|jwt)\(\)|current_setting\('
      )
  LOOP
    v_using := r.using_expr;
    v_check := r.check_expr;

    IF v_using IS NOT NULL THEN
      v_using := regexp_replace(v_using, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
      v_using := regexp_replace(v_using, 'auth\.jwt\(\)', '(select auth.jwt())', 'gi');
      v_using := regexp_replace(v_using, 'current_setting\(([^()]*)\)', '(select current_setting(\1))', 'gi');
    END IF;
    IF v_check IS NOT NULL THEN
      v_check := regexp_replace(v_check, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
      v_check := regexp_replace(v_check, 'auth\.jwt\(\)', '(select auth.jwt())', 'gi');
      v_check := regexp_replace(v_check, 'current_setting\(([^()]*)\)', '(select current_setting(\1))', 'gi');
    END IF;

    v_cmd := CASE r.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      ELSE 'ALL'
    END;
    SELECT string_agg(quote_ident(x.rolname), ', ')
      INTO v_roles
    FROM pg_roles x
    WHERE x.oid = ANY(r.polroles);
    v_permissive := CASE WHEN r.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END;

    EXECUTE format('DROP POLICY %I ON %I.%I', r.polname, r.nspname, r.relname);
    v_stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
                     r.polname, r.nspname, r.relname, v_permissive, v_cmd,
                     coalesce(nullif(v_roles, ''), 'PUBLIC'));
    IF v_using IS NOT NULL THEN
      v_stmt := v_stmt || format(' USING (%s)', v_using);
    END IF;
    IF v_check IS NOT NULL THEN
      v_stmt := v_stmt || format(' WITH CHECK (%s)', v_check);
    END IF;
    EXECUTE v_stmt;
  END LOOP;
END $$;

-- Keep the public API surface limited to authenticated callers for functions
-- whose bodies enforce their own identity/role checks.
REVOKE ALL ON FUNCTION public.book_class(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.book_pt_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_pt_program_with_sessions(jsonb,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_class_attendance_counts(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_infotainment_schedule(timestamptz,timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin_or_manager() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.place_coffee_order(jsonb,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.place_coffee_order_v2(jsonb,text,uuid) FROM PUBLIC, anon;
-- reorder_pt_program_sessions is created in the later PT reorder migration,
-- which applies its own explicit REVOKE/GRANT after the function exists.
REVOKE ALL ON FUNCTION public.skip_coffee_product_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_coffee_product_review(uuid,integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.toggle_social_reaction(uuid,text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.book_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_pt_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pt_program_with_sessions(jsonb,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_class_attendance_counts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_infotainment_schedule(timestamptz,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_coffee_order(jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_coffee_order_v2(jsonb,text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.skip_coffee_product_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_coffee_product_review(uuid,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_social_reaction(uuid,text) TO authenticated;
