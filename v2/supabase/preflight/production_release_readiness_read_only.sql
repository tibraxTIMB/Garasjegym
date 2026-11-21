-- Read-only Production release readiness inventory. No DDL or DML.
WITH expected_tables(table_name) AS (VALUES
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
expected_columns(table_name,column_name) AS (VALUES
  ('class_bookings','attendance_status'),
  ('class_bookings','attendance_marked_at'),
  ('class_bookings','attendance_marked_by'),
  ('classes','instructor_id'),
  ('classes','published'),
  ('classes','cancelled_at'),
  ('classes','cancelled_by'),
  ('classes','cancellation_note'),
  ('classes','prep_text'),
  ('classes','main_text'),
  ('classes','finish_text'),
  ('classes','coach_notes'),
  ('member_preferences','created_at'),
  ('member_preferences','last_seen_pt_wod_at'),
  ('member_preferences','spotify_genre_playlists'),
  ('member_preferences','hr_enabled'),
  ('member_preferences','hr_share_with_pt'),
  ('member_preferences','hr_share_on_screen'),
  ('member_preferences','hr_save_history'),
  ('profiles','email'),
  ('profiles','membership_status'),
  ('profiles','member_rank'),
  ('pt_requests','archived_at'),
  ('pt_requests','pt_session_id'),
  ('pt_sessions','session_type'),
  ('pt_sessions','coach_notes'),
  ('pt_sessions','completed_notes'),
  ('pt_sessions','attendance_status'),
  ('pt_sessions','cancellation_note'),
  ('social_posts','author_role'),
  ('wods','is_archived'),
  ('wods','category'),
  ('workout_logs','class_live_session_id'),
  ('workout_logs','save_token'),
  ('workout_sets','height_cm')
),
expected_rpcs(function_name) AS (VALUES
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
missing_tables AS (
  SELECT e.table_name item FROM expected_tables e
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables t
    WHERE t.table_schema='public' AND t.table_type='BASE TABLE' AND t.table_name=e.table_name
  )
),
missing_columns AS (
  SELECT e.table_name||'.'||e.column_name item FROM expected_columns e
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema='public' AND c.table_name=e.table_name AND c.column_name=e.column_name
  )
),
missing_rls AS (
  SELECT e.table_name item
  FROM expected_tables e
  JOIN information_schema.tables t ON t.table_schema='public' AND t.table_name=e.table_name
  JOIN pg_class c ON c.relname=e.table_name
  JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
  WHERE t.table_type='BASE TABLE' AND NOT c.relrowsecurity
),
missing_rpcs AS (
  SELECT e.function_name item FROM expected_rpcs e
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace='public'::regnamespace AND p.proname=e.function_name
  )
)
SELECT 'missing_table' category,item,'BLOCKER' severity FROM missing_tables
UNION ALL
SELECT 'missing_required_column',item,'BLOCKER' FROM missing_columns
UNION ALL
SELECT 'missing_rls',item,'BLOCKER' FROM missing_rls
UNION ALL
SELECT 'missing_rpc',item,'BLOCKER' FROM missing_rpcs
UNION ALL
SELECT 'summary','expected_tables='||(SELECT count(*) FROM expected_tables)
  ||'; required_existing_columns='||(SELECT count(*) FROM expected_columns)
  ||'; present_tables='||(SELECT count(*) FROM expected_tables e WHERE NOT EXISTS (SELECT 1 FROM missing_tables m WHERE m.item=e.table_name))
  ||'; missing_tables='||(SELECT count(*) FROM missing_tables)
  ||'; missing_columns='||(SELECT count(*) FROM missing_columns)
  ||'; missing_rls='||(SELECT count(*) FROM missing_rls)
  ||'; expected_rpcs='||(SELECT count(*) FROM expected_rpcs)
  ||'; missing_rpcs='||(SELECT count(*) FROM missing_rpcs),
  CASE WHEN (SELECT count(*) FROM missing_tables)+(SELECT count(*) FROM missing_columns)+(SELECT count(*) FROM missing_rls)+(SELECT count(*) FROM missing_rpcs)=0 THEN 'PASS' ELSE 'BLOCKER' END
ORDER BY category,item;
