-- Full post-migration Supabase contract assertions; read-only.
-- Executed only against the ephemeral local Supabase PG17 stack in CI.
WITH expected_tables(table_name) AS (
  VALUES
    ('calendar_events'),
    ('challenge_participants'),
    ('challenges'),
    ('class_bookings'),
    ('class_live_sessions'),
    ('class_session_wod_completions'),
    ('classes'),
    ('coffee_order_items'),
    ('coffee_orders'),
    ('coffee_product_reviews'),
    ('coffee_products'),
    ('coffee_settings'),
    ('daily_wod'),
    ('exercise_favorites'),
    ('exercises'),
    ('member_preferences'),
    ('notifications'),
    ('personal_records'),
    ('profiles'),
    ('pt_bookings'),
    ('pt_checkins'),
    ('pt_client_assignments'),
    ('pt_client_goals'),
    ('pt_client_notes'),
    ('pt_coaches'),
    ('pt_intakes'),
    ('pt_messages'),
    ('pt_program_sessions'),
    ('pt_program_templates'),
    ('pt_programs'),
    ('pt_requests'),
    ('pt_service_requests'),
    ('pt_services'),
    ('pt_session_exercises'),
    ('pt_sessions'),
    ('pt_wod_assignments'),
    ('social_comments'),
    ('social_posts'),
    ('training_session_wods'),
    ('training_sessions'),
    ('wod_daily_schedules'),
    ('wod_favorites'),
    ('wods'),
    ('workout_exercises'),
    ('workout_logs'),
    ('workout_sets')
),
expected_rpcs(function_name) AS (
  VALUES
    ('add_wod_to_class'),
    ('archive_pt_program'),
    ('archive_pt_program_session'),
    ('assign_pt_coach'),
    ('book_class'),
    ('cancel_class'),
    ('cancel_pt_booking'),
    ('cancel_pt_session'),
    ('create_pt_program_with_sessions'),
    ('create_pt_session_from_request'),
    ('create_training_session_with_wods'),
    ('get_class_attendance_counts'),
    ('get_coffee_stats'),
    ('get_member_workout_leaderboard'),
    ('move_pt_program_session'),
    ('publish_class_session_results'),
    ('record_workout_prs'),
    ('reorder_pt_program_sessions'),
    ('restore_pt_program'),
    ('restore_pt_program_session'),
    ('save_wod_with_pt_assignment'),
    ('save_workout_with_pt_links'),
    ('skip_coffee_product_review'),
    ('submit_coffee_product_review'),
    ('toggle_social_reaction'),
    ('update_pt_session_details')
),
table_check AS (
  SELECT count(*)::int AS present_count
  FROM expected_tables e
  WHERE EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=e.table_name AND c.relkind IN ('r','p')
  )
),
rls_check AS (
  SELECT count(*)::int AS enabled_count
  FROM expected_tables e
  JOIN pg_class c ON c.relname=e.table_name
  JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
  WHERE c.relrowsecurity
),
rpc_check AS (
  SELECT count(*)::int AS present_count,
         count(*) FILTER (WHERE p.oid IS NOT NULL AND has_function_privilege('authenticated',p.oid,'EXECUTE'))::int AS auth_exec_count,
         count(*) FILTER (WHERE p.oid IS NOT NULL AND has_function_privilege('anon',p.oid,'EXECUTE'))::int AS anon_exec_count
  FROM expected_rpcs e
  LEFT JOIN pg_proc p ON p.pronamespace='public'::regnamespace AND p.proname=e.function_name
),
anon_table_privileges AS (
  SELECT count(*)::int AS exposed_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','v','m','p')
    AND (has_table_privilege('anon',c.oid,'SELECT')
      OR has_table_privilege('anon',c.oid,'INSERT')
      OR has_table_privilege('anon',c.oid,'UPDATE')
      OR has_table_privilege('anon',c.oid,'DELETE'))
),
trigger_exec AS (
  SELECT count(*)::int AS exposed_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_proc p ON p.oid=t.tgfoid
  JOIN pg_namespace pn ON pn.oid=p.pronamespace
  WHERE NOT t.tgisinternal
    AND n.nspname='public' AND pn.nspname='public'
    AND (has_function_privilege('anon',p.oid,'EXECUTE')
      OR has_function_privilege('authenticated',p.oid,'EXECUTE'))
),
membership_defaults AS (
  SELECT
    (SELECT column_default FROM information_schema.columns
     WHERE table_schema='public' AND table_name='profiles' AND column_name='active') AS active_default,
    (SELECT column_default FROM information_schema.columns
     WHERE table_schema='public' AND table_name='profiles' AND column_name='membership_status') AS status_default,
    pg_get_functiondef('public.handle_new_auth_user()'::regprocedure) AS signup_definition
),
critical_policies AS (
  SELECT
    (SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='class_bookings'
      AND policyname='class_bookings_read_own_or_staff') AS class_booking_qual,
    (SELECT qual FROM pg_policies WHERE schemaname='public' AND tablename='pt_sessions'
      AND policyname='pt_sessions_read') AS pt_sessions_qual
)
SELECT
  (SELECT present_count FROM table_check) = 46 AS all_46_expected_tables_present,
  (SELECT enabled_count FROM rls_check) = 46 AS all_46_tables_have_rls,
  (SELECT present_count FROM rpc_check) = 26 AS all_26_app_rpcs_present,
  (SELECT auth_exec_count FROM rpc_check) = 26 AS authenticated_can_execute_all_app_rpcs,
  (SELECT anon_exec_count FROM rpc_check) = 0 AS anon_cannot_execute_app_rpcs,
  (SELECT exposed_count FROM anon_table_privileges) = 0 AS anon_has_no_public_table_privileges,
  (SELECT exposed_count FROM trigger_exec) = 0 AS trigger_functions_not_directly_executable_by_clients,
  position('false' in lower(coalesce((SELECT active_default FROM membership_defaults),''))) > 0
    AS new_profile_active_defaults_false,
  position('pending' in lower(coalesce((SELECT status_default FROM membership_defaults),''))) > 0
    AS new_profile_membership_defaults_pending,
  position('pending' in lower((SELECT signup_definition FROM membership_defaults))) > 0
    AND position('false' in lower((SELECT signup_definition FROM membership_defaults))) > 0
    AS auth_signup_trigger_creates_inactive_pending,
  position('member_id' in lower(coalesce((SELECT class_booking_qual FROM critical_policies),''))) > 0
    AND position('is_admin_or_manager' in lower(coalesce((SELECT class_booking_qual FROM critical_policies),''))) > 0
    AS class_booking_read_is_owner_or_staff,
  position('client_id' in lower(coalesce((SELECT pt_sessions_qual FROM critical_policies),''))) > 0
    AND position('is_pt_coach_for_member' in lower(coalesce((SELECT pt_sessions_qual FROM critical_policies),''))) > 0
    AND position('has_own_pt_session_booking' in lower(coalesce((SELECT pt_sessions_qual FROM critical_policies),''))) > 0
    AS pt_session_read_has_private_coach_and_booking_boundaries;
