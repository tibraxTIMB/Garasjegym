-- DESTRUCTIVE OWNER-APPROVED CUTOVER ONLY: TEST project izwzwvlexqxqewzijhhd.
-- The legacy Production project kultdmklwmilhoytrrig MUST NOT run this file.
-- The owner waived recovery/backup for this former TEST project's data and
-- explicitly chose it as the new live project on 2026-11-21.
-- Keep all schema, 135 provisional system exercises, RLS and functions.
-- Auth users/identities/sessions and all non-catalogue operational rows are removed.
-- After commit, tibrakestad@gmail.com must register as a NEW verified owner.
-- Auth JWTs issued to removed users can remain cryptographically valid until
-- expiration; missing profile + membership gate must deny application access.

BEGIN;
SET LOCAL app.clean_start_target = 'owner-approved-test-cutover';

DO $guard$
DECLARE
  v_tables bigint;
  v_system_exercises bigint;
  v_auth_users bigint;
  v_profiles bigint;
  v_owner_email_users bigint;
BEGIN
  IF current_setting('app.clean_start_target',true) <> 'owner-approved-test-cutover' THEN
    RAISE EXCEPTION 'Refusing unapproved clean start';
  END IF;
  SELECT count(*) INTO v_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind IN ('r','p');
  SELECT count(*) INTO v_system_exercises FROM public.exercises WHERE created_by IS NULL;
  SELECT count(*) INTO v_auth_users FROM auth.users;
  SELECT count(*) INTO v_profiles FROM public.profiles;
  SELECT count(*) INTO v_owner_email_users FROM auth.users
   WHERE lower(email)='tibrakestad@gmail.com';
  IF v_tables<>46 OR v_system_exercises<>135 OR v_auth_users<>4 OR v_profiles<>4 OR v_owner_email_users<>1 THEN
    RAISE EXCEPTION 'Refusing cutover: tables=% catalogue=% users=% profiles=% old_owner_email=%',
      v_tables,v_system_exercises,v_auth_users,v_profiles,v_owner_email_users;
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects) THEN
    RAISE EXCEPTION 'Storage is not empty; do not delete Auth accounts owning objects';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass
       AND tgname='sturmkopf_guard_first_owner_registration' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass
       AND tgname='sturmkopf_promote_verified_first_owner' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Verified new-owner registration triggers are not installed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.pt_sessions'::regclass
      AND tgname='pt_sessions_prevent_history_delete' AND tgenabled='O')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.wods'::regclass
      AND tgname='wods_prevent_deleting_referenced_history' AND tgenabled='O') THEN
    RAISE EXCEPTION 'Expected PT/WOD lifecycle triggers are missing or not enabled';
  END IF;
END;
$guard$;

-- Ordinary PT/WOD history protections intentionally prohibit user-facing
-- deletion. Temporarily suspend ONLY these two guards inside this atomic,
-- owner-approved clean-start transaction, then re-enable before commit.
-- Any error rolls back both the data changes and trigger state.
ALTER TABLE public.pt_sessions DISABLE TRIGGER pt_sessions_prevent_history_delete;
ALTER TABLE public.wods DISABLE TRIGGER wods_prevent_deleting_referenced_history;

-- Child and dependent operational records first; never TRUNCATE CASCADE.
DELETE FROM public.class_session_wod_completions;
DELETE FROM public.class_bookings;
DELETE FROM public.class_live_sessions;
DELETE FROM public.wod_daily_schedules;
DELETE FROM public.calendar_events;
DELETE FROM public.challenge_participants;
DELETE FROM public.challenges;
DELETE FROM public.social_comments;
DELETE FROM public.social_posts;
DELETE FROM public.coffee_product_reviews;
DELETE FROM public.coffee_order_items;
DELETE FROM public.coffee_orders;
DELETE FROM public.coffee_products;
DELETE FROM public.coffee_settings;
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
DELETE FROM public.training_session_wods;
DELETE FROM public.training_sessions;
DELETE FROM public.wod_favorites;
DELETE FROM public.daily_wod;
DELETE FROM public.personal_records;
DELETE FROM public.workout_sets;
DELETE FROM public.workout_exercises;
DELETE FROM public.workout_logs;
DELETE FROM public.wods;
DELETE FROM public.classes;
DELETE FROM public.exercise_favorites;
DELETE FROM public.member_preferences;
DELETE FROM public.notifications;
DELETE FROM public.exercises WHERE created_by IS NOT NULL;

ALTER TABLE public.pt_sessions ENABLE TRIGGER pt_sessions_prevent_history_delete;
ALTER TABLE public.wods ENABLE TRIGGER wods_prevent_deleting_referenced_history;

-- Supabase allows Auth user removal from auth.users; linked identities,
-- refresh tokens, sessions and profiles must cascade. No Storage objects exist.
DELETE FROM auth.users;

DO $postcheck$
DECLARE
  v_nonempty bigint;
BEGIN
  IF (SELECT count(*) FROM public.exercises WHERE created_by IS NULL) <> 135
    OR (SELECT count(*) FROM public.exercises WHERE created_by IS NOT NULL) <> 0
    OR (SELECT count(*) FROM auth.users) <> 0
    OR (SELECT count(*) FROM auth.identities) <> 0
    OR (SELECT count(*) FROM auth.sessions) <> 0
    OR (SELECT count(*) FROM auth.refresh_tokens) <> 0
    OR (SELECT count(*) FROM public.profiles) <> 0 THEN
    RAISE EXCEPTION 'Clean-start Auth/catalogue postcondition failed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.pt_sessions'::regclass
      AND tgname='pt_sessions_prevent_history_delete' AND tgenabled='O')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.wods'::regclass
      AND tgname='wods_prevent_deleting_referenced_history' AND tgenabled='O') THEN
    RAISE EXCEPTION 'Lifecycle triggers were not restored after clean start';
  END IF;
  SELECT count(*) INTO v_nonempty FROM (
    SELECT count(*) n FROM public.calendar_events
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
  ) rows WHERE n<>0;
  IF v_nonempty<>0 THEN RAISE EXCEPTION 'Operational tables remain nonempty: %',v_nonempty; END IF;
  RAISE NOTICE 'Owner-approved TEST clean start verified: 135 system exercises, no legacy users or operations.';
END;
$postcheck$;

COMMIT;
