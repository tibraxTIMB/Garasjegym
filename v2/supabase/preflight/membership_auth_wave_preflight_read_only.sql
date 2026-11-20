-- STURMKOPF FEUER 1.1 – production Membership/Auth wave preflight.
-- READ ONLY. Emits counts/status flags only; no email addresses or user UUIDs.
-- Run immediately before any isolated rehearsal and again before an approved change.

SELECT
  (SELECT count(*) FROM public.profiles) AS profile_count,
  (SELECT count(*) FROM public.profiles WHERE active) AS active_profile_count,
  (SELECT count(*) FROM public.profiles WHERE NOT active) AS inactive_profile_count,
  (SELECT count(*) FROM public.profiles WHERE active AND role='admin') AS active_admin_count,
  (SELECT count(*) FROM public.profiles WHERE active AND role='manager') AS active_manager_count,
  (SELECT count(*) FROM public.profiles WHERE active AND role='member') AS active_member_count,
  (SELECT count(*) FROM public.profiles WHERE role NOT IN ('admin','manager','member')) AS unexpected_role_count,
  (SELECT count(*) FROM auth.users) AS auth_user_count,
  (SELECT count(*) FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id WHERE p.id IS NULL) AS auth_users_without_profile,
  (SELECT count(*) FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL) AS profiles_without_auth_user,
  (SELECT count(*) FROM (
     SELECT lower(email) FROM auth.users
     WHERE email IS NOT NULL AND email <> ''
     GROUP BY lower(email) HAVING count(*) > 1
   ) duplicates) AS duplicate_auth_email_groups,
  (SELECT column_default FROM information_schema.columns
   WHERE table_schema='public' AND table_name='profiles' AND column_name='active') AS active_column_default,
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='profiles' AND column_name='email') AS profiles_email_column_present,
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='profiles' AND column_name='membership_status') AS membership_status_column_present,
  (SELECT c.relrowsecurity FROM pg_class c
   JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='profiles') AS profiles_rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='profiles') AS profiles_policy_count,
  has_table_privilege('anon','public.profiles','SELECT') AS anon_can_select_profiles,
  has_table_privilege('authenticated','public.profiles','SELECT') AS authenticated_can_select_profiles,
  (SELECT count(*) FROM pg_trigger t
   JOIN pg_class c ON c.oid=t.tgrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='auth' AND c.relname='users'
     AND t.tgname='on_auth_user_created' AND NOT t.tgisinternal) AS auth_signup_trigger_count,
  (SELECT p.prosecdef FROM pg_proc p
   JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='handle_new_auth_user'
     AND pg_get_function_identity_arguments(p.oid)='') AS signup_trigger_security_definer,
  (SELECT p.proconfig FROM pg_proc p
   JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='handle_new_auth_user'
     AND pg_get_function_identity_arguments(p.oid)='') AS signup_trigger_settings,
  (SELECT position('active' IN pg_get_functiondef(p.oid)) > 0
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='handle_new_auth_user'
     AND pg_get_function_identity_arguments(p.oid)='') AS signup_trigger_mentions_active_column,
  (SELECT position('membership_status' IN pg_get_functiondef(p.oid)) > 0
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='is_active_user'
     AND pg_get_function_identity_arguments(p.oid)='') AS active_user_helper_checks_membership_status;
