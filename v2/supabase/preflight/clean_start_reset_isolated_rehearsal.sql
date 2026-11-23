-- DESTRUCTIVE ONLY WITHIN AN EXPLICITLY MARKED ISOLATED REHEARSAL TRANSACTION.
-- This file is NOT a production reset script and deliberately refuses any target
-- unless the caller sets app.clean_start_target='isolated-rehearsal' in the
-- current transaction. It is used by CI with BEGIN/ROLLBACK only.
--
-- The owner must use the Supabase Auth Admin API / Dashboard for real Auth deletion
-- in any eventual Production run. Do not copy this file into Production.
--
-- Preserves: all 194 expanded system exercises (created_by IS NULL), schema,
-- functions, triggers, constraints, indexes, RLS, grants, policies and integrations.
-- Clears: all operational tables, custom exercises, and all Auth users/identities
-- on this disposable local database. Storage object bytes are not deleted by SQL:
-- the rehearsal refuses to proceed if storage.objects contains any object.

DO $clean_start_guard$
DECLARE
  v_table_count integer;
  v_storage_objects boolean := false;
  v_system_exercises integer;
BEGIN
  IF current_setting('app.clean_start_target', true) IS DISTINCT FROM 'isolated-rehearsal' THEN
    RAISE EXCEPTION 'Refusing clean-start: app.clean_start_target must be isolated-rehearsal';
  END IF;

  SELECT count(*) INTO v_table_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind IN ('r','p');

  IF v_table_count <> 46 THEN
    RAISE EXCEPTION 'Refusing clean-start: expected 46 public application tables, found %',v_table_count;
  END IF;

  SELECT count(*) INTO v_system_exercises
  FROM public.exercises
  WHERE created_by IS NULL;

  IF v_system_exercises <> 194 THEN
    RAISE EXCEPTION 'Refusing clean-start: expected 194 system exercises before reset, found %',v_system_exercises;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM storage.objects)' INTO v_storage_objects;
  END IF;

  IF v_storage_objects THEN
    RAISE EXCEPTION 'Refusing clean-start: Storage objects exist; remove them through the Storage API and verify the backup before retrying';
  END IF;
END;
$clean_start_guard$;

-- Class/live attendance and calendar dependencies.
DELETE FROM public.class_session_wod_completions;
DELETE FROM public.class_bookings;
DELETE FROM public.class_live_sessions;
DELETE FROM public.wod_daily_schedules;
DELETE FROM public.calendar_events;

-- Challenges and social content.
DELETE FROM public.challenge_participants;
DELETE FROM public.challenges;
DELETE FROM public.social_comments;
DELETE FROM public.social_posts;

-- Coffee transactions and legacy configuration. New default settings are
-- initialized later by the app/owner; old settings are not carried forward.
DELETE FROM public.coffee_product_reviews;
DELETE FROM public.coffee_order_items;
DELETE FROM public.coffee_orders;
DELETE FROM public.coffee_products;
DELETE FROM public.coffee_settings;

-- PT records: remove children and all references before parent sessions/profiles.
DELETE FROM public.pt_bookings;
DELETE FROM public.pt_session_exercises;
DELETE FROM public.pt_requests;
DELETE FROM public.pt_wod_assignments;
DELETE FROM public.pt_program_sessions;
DELETE FROM public.pt_programs;
DELETE FROM public.pt_program_templates;
DELETE FROM public.pt_service_requests;
DELETE FROM public.pt_services;
DELETE FROM public.pt_client_assignments;
DELETE FROM public.pt_client_goals;
DELETE FROM public.pt_client_notes;
DELETE FROM public.pt_coaches;
DELETE FROM public.pt_intakes;
DELETE FROM public.pt_messages;
DELETE FROM public.pt_checkins;
DELETE FROM public.pt_sessions;

-- Training and WOD records.
DELETE FROM public.training_session_wods;
DELETE FROM public.training_sessions;
DELETE FROM public.wod_favorites;
DELETE FROM public.daily_wod;
DELETE FROM public.personal_records;
DELETE FROM public.workout_sets;
DELETE FROM public.workout_exercises;
DELETE FROM public.workout_logs;
DELETE FROM public.wods;

-- Remaining member operational rows.
DELETE FROM public.classes;
DELETE FROM public.exercise_favorites;
DELETE FROM public.member_preferences;
DELETE FROM public.notifications;

-- User-created exercises are not part of the standard catalogue. Remove them
-- before Auth users because exercises.created_by uses ON DELETE SET NULL.
DELETE FROM public.exercises WHERE created_by IS NOT NULL;

-- This direct Auth deletion is permitted here only because the target guard
-- requires the disposable local rehearsal transaction. Production must use the
-- Auth Admin API / Dashboard, not this SQL statement.
DELETE FROM auth.users;

DO $clean_start_postcondition$
DECLARE
  v_system_exercises integer;
  v_custom_exercises integer;
  v_auth_users integer;
  v_profiles integer;
  v_identities integer;
  v_auth_sessions integer;
  v_auth_refresh_tokens integer;
  v_auth_mfa_factors integer;
  v_auth_mfa_challenges integer;
  v_nonempty_operational_tables integer;
  v_storage_objects boolean := false;
BEGIN
  SELECT count(*) INTO v_system_exercises FROM public.exercises WHERE created_by IS NULL;
  SELECT count(*) INTO v_custom_exercises FROM public.exercises WHERE created_by IS NOT NULL;
  SELECT count(*) INTO v_auth_users FROM auth.users;
  SELECT count(*) INTO v_profiles FROM public.profiles;
  SELECT count(*) INTO v_identities FROM auth.identities;
  SELECT count(*) INTO v_auth_sessions FROM auth.sessions;
  SELECT count(*) INTO v_auth_refresh_tokens FROM auth.refresh_tokens;
  SELECT count(*) INTO v_auth_mfa_factors FROM auth.mfa_factors;
  SELECT count(*) INTO v_auth_mfa_challenges FROM auth.mfa_challenges;

  SELECT count(*) INTO v_nonempty_operational_tables
  FROM (
    SELECT count(*)::bigint AS n FROM public.calendar_events
    UNION ALL SELECT count(*) FROM public.challenge_participants
    UNION ALL SELECT count(*) FROM public.challenges
    UNION ALL SELECT count(*) FROM public.class_bookings
    UNION ALL SELECT count(*) FROM public.class_live_sessions
    UNION ALL SELECT count(*) FROM public.class_session_wod_completions
    UNION ALL SELECT count(*) FROM public.classes
    UNION ALL SELECT count(*) FROM public.coffee_order_items
    UNION ALL SELECT count(*) FROM public.coffee_orders
    UNION ALL SELECT count(*) FROM public.coffee_product_reviews
    UNION ALL SELECT count(*) FROM public.coffee_products
    UNION ALL SELECT count(*) FROM public.coffee_settings
    UNION ALL SELECT count(*) FROM public.daily_wod
    UNION ALL SELECT count(*) FROM public.exercise_favorites
    UNION ALL SELECT count(*) FROM public.member_preferences
    UNION ALL SELECT count(*) FROM public.notifications
    UNION ALL SELECT count(*) FROM public.personal_records
    UNION ALL SELECT count(*) FROM public.pt_bookings
    UNION ALL SELECT count(*) FROM public.pt_checkins
    UNION ALL SELECT count(*) FROM public.pt_client_assignments
    UNION ALL SELECT count(*) FROM public.pt_client_goals
    UNION ALL SELECT count(*) FROM public.pt_client_notes
    UNION ALL SELECT count(*) FROM public.pt_coaches
    UNION ALL SELECT count(*) FROM public.pt_intakes
    UNION ALL SELECT count(*) FROM public.pt_messages
    UNION ALL SELECT count(*) FROM public.pt_program_sessions
    UNION ALL SELECT count(*) FROM public.pt_program_templates
    UNION ALL SELECT count(*) FROM public.pt_programs
    UNION ALL SELECT count(*) FROM public.pt_requests
    UNION ALL SELECT count(*) FROM public.pt_service_requests
    UNION ALL SELECT count(*) FROM public.pt_services
    UNION ALL SELECT count(*) FROM public.pt_session_exercises
    UNION ALL SELECT count(*) FROM public.pt_sessions
    UNION ALL SELECT count(*) FROM public.pt_wod_assignments
    UNION ALL SELECT count(*) FROM public.social_comments
    UNION ALL SELECT count(*) FROM public.social_posts
    UNION ALL SELECT count(*) FROM public.training_session_wods
    UNION ALL SELECT count(*) FROM public.training_sessions
    UNION ALL SELECT count(*) FROM public.wod_daily_schedules
    UNION ALL SELECT count(*) FROM public.wod_favorites
    UNION ALL SELECT count(*) FROM public.wods
    UNION ALL SELECT count(*) FROM public.workout_exercises
    UNION ALL SELECT count(*) FROM public.workout_logs
    UNION ALL SELECT count(*) FROM public.workout_sets
  ) counts
  WHERE n <> 0;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM storage.objects)' INTO v_storage_objects;
  END IF;

  IF v_system_exercises <> 194
     OR v_custom_exercises <> 0
     OR v_auth_users <> 0
     OR v_profiles <> 0
     OR v_identities <> 0
     OR v_auth_sessions <> 0
     OR v_auth_refresh_tokens <> 0
     OR v_auth_mfa_factors <> 0
     OR v_auth_mfa_challenges <> 0
     OR v_nonempty_operational_tables <> 0
     OR v_storage_objects THEN
    RAISE EXCEPTION
      'Clean-start postcondition failed: system_exercises=% custom_exercises=% auth_users=% profiles=% identities=% sessions=% refresh_tokens=% mfa_factors=% mfa_challenges=% nonempty_operational_tables=% storage_objects=%',
      v_system_exercises,v_custom_exercises,v_auth_users,v_profiles,v_identities,
      v_auth_sessions,v_auth_refresh_tokens,v_auth_mfa_factors,v_auth_mfa_challenges,
      v_nonempty_operational_tables,v_storage_objects;
  END IF;

  RAISE NOTICE 'Isolated clean-start reset passed: 194 system exercises retained; all legacy Auth/profile and operational rows cleared.';
END;
$clean_start_postcondition$;
