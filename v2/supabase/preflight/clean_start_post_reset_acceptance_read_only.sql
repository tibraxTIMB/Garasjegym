-- Read-only post-reset acceptance checks. This file contains no DML/DDL.
-- Binding clean-start contract: exactly one newly created owner admin/Auth identity,
-- no legacy profiles/users or operational history, and exactly 135 provisional
-- system exercises with no custom exercise rows.
-- Run only on an isolated Production-derived rehearsal target after reset.
-- Also run exercise_catalogue_manifest_assertions.sql for exact names/categories.
WITH profiles_state AS (
  SELECT count(*) profile_count,
         count(*) FILTER (WHERE role='admin' AND active=true AND membership_status='approved') valid_admin_count,
         count(*) FILTER (WHERE role<>'admin') non_admin_profiles,
         count(*) FILTER (WHERE role='manager') manager_profiles,
         count(*) FILTER (WHERE role='member') member_profiles
  FROM public.profiles
),
auth_state AS (
  SELECT count(*) auth_users,
         count(*) FILTER (WHERE p.id IS NOT NULL) linked_users,
         count(*) FILTER (WHERE p.id IS NULL) auth_without_profile
  FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
),
auth_identity_state AS (
  SELECT count(*) identity_count,
         count(*) FILTER (WHERE i.user_id NOT IN (SELECT id FROM auth.users)) foreign_identities
  FROM auth.identities i
),
orphan_profile_state AS (
  SELECT count(*) profile_without_auth
  FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id
  WHERE u.id IS NULL
),
exercise_state AS (
  SELECT count(*) FILTER (WHERE created_by IS NOT NULL) custom_exercises,
         count(*) FILTER (WHERE created_by IS NULL) system_catalog_total
  FROM public.exercises
),
operational_counts AS (
  SELECT 'calendar_events'::text table_name,count(*)::bigint row_count FROM public.calendar_events
  UNION ALL SELECT 'challenge_participants',count(*) FROM public.challenge_participants
  UNION ALL SELECT 'challenges',count(*) FROM public.challenges
  UNION ALL SELECT 'class_bookings',count(*) FROM public.class_bookings
  UNION ALL SELECT 'class_live_sessions',count(*) FROM public.class_live_sessions
  UNION ALL SELECT 'class_session_wod_completions',count(*) FROM public.class_session_wod_completions
  UNION ALL SELECT 'classes',count(*) FROM public.classes
  UNION ALL SELECT 'coffee_order_items',count(*) FROM public.coffee_order_items
  UNION ALL SELECT 'coffee_orders',count(*) FROM public.coffee_orders
  UNION ALL SELECT 'coffee_product_reviews',count(*) FROM public.coffee_product_reviews
  UNION ALL SELECT 'coffee_products',count(*) FROM public.coffee_products
  UNION ALL SELECT 'coffee_settings',count(*) FROM public.coffee_settings
  UNION ALL SELECT 'daily_wod',count(*) FROM public.daily_wod
  UNION ALL SELECT 'exercise_favorites',count(*) FROM public.exercise_favorites
  UNION ALL SELECT 'member_preferences',count(*) FROM public.member_preferences
  UNION ALL SELECT 'notifications',count(*) FROM public.notifications
  UNION ALL SELECT 'personal_records',count(*) FROM public.personal_records
  UNION ALL SELECT 'pt_bookings',count(*) FROM public.pt_bookings
  UNION ALL SELECT 'pt_checkins',count(*) FROM public.pt_checkins
  UNION ALL SELECT 'pt_client_assignments',count(*) FROM public.pt_client_assignments
  UNION ALL SELECT 'pt_client_goals',count(*) FROM public.pt_client_goals
  UNION ALL SELECT 'pt_client_notes',count(*) FROM public.pt_client_notes
  UNION ALL SELECT 'pt_coaches',count(*) FROM public.pt_coaches
  UNION ALL SELECT 'pt_intakes',count(*) FROM public.pt_intakes
  UNION ALL SELECT 'pt_messages',count(*) FROM public.pt_messages
  UNION ALL SELECT 'pt_program_sessions',count(*) FROM public.pt_program_sessions
  UNION ALL SELECT 'pt_program_templates',count(*) FROM public.pt_program_templates
  UNION ALL SELECT 'pt_programs',count(*) FROM public.pt_programs
  UNION ALL SELECT 'pt_requests',count(*) FROM public.pt_requests
  UNION ALL SELECT 'pt_service_requests',count(*) FROM public.pt_service_requests
  UNION ALL SELECT 'pt_services',count(*) FROM public.pt_services
  UNION ALL SELECT 'pt_session_exercises',count(*) FROM public.pt_session_exercises
  UNION ALL SELECT 'pt_sessions',count(*) FROM public.pt_sessions
  UNION ALL SELECT 'pt_wod_assignments',count(*) FROM public.pt_wod_assignments
  UNION ALL SELECT 'social_comments',count(*) FROM public.social_comments
  UNION ALL SELECT 'social_posts',count(*) FROM public.social_posts
  UNION ALL SELECT 'training_session_wods',count(*) FROM public.training_session_wods
  UNION ALL SELECT 'training_sessions',count(*) FROM public.training_sessions
  UNION ALL SELECT 'wod_daily_schedules',count(*) FROM public.wod_daily_schedules
  UNION ALL SELECT 'wod_favorites',count(*) FROM public.wod_favorites
  UNION ALL SELECT 'wods',count(*) FROM public.wods
  UNION ALL SELECT 'workout_exercises',count(*) FROM public.workout_exercises
  UNION ALL SELECT 'workout_logs',count(*) FROM public.workout_logs
  UNION ALL SELECT 'workout_sets',count(*) FROM public.workout_sets
)
SELECT 'owner_admin' section,'exactly_one_active_approved_admin' item,
       CASE WHEN profile_count=1 AND valid_admin_count=1 AND non_admin_profiles=0
            THEN 'PASS' ELSE 'FAIL' END status,
       format('profiles=%s admins=%s non_admin_profiles=%s managers=%s members=%s',
              profile_count,valid_admin_count,non_admin_profiles,manager_profiles,member_profiles) detail
FROM profiles_state
UNION ALL
SELECT 'auth','exactly_one_owner_auth_identity',
       CASE WHEN auth_users=1 AND linked_users=1 AND auth_without_profile=0 AND profile_without_auth=0
            THEN 'PASS' ELSE 'FAIL' END,
       format('auth_users=%s linked=%s auth_without_profile=%s profile_without_auth=%s',
              auth_users,linked_users,auth_without_profile,profile_without_auth)
FROM auth_state CROSS JOIN orphan_profile_state
UNION ALL
SELECT 'auth','exactly_one_identity_linked_to_owner',
       CASE WHEN identity_count=1 AND foreign_identities=0 THEN 'PASS' ELSE 'FAIL' END,
       format('identities=%s foreign_or_legacy_identities=%s',identity_count,foreign_identities)
FROM auth_identity_state
UNION ALL
SELECT 'exercise_catalogue','exactly_135_system_exercises_and_no_custom_rows',
       CASE WHEN system_catalog_total=135 AND custom_exercises=0 THEN 'PASS' ELSE 'FAIL' END,
       format('total_system_catalog=%s/135 provisional_manifest custom=%s; exact names/categories must also pass exercise_catalogue_manifest_assertions.sql',
              system_catalog_total,custom_exercises)
FROM exercise_state
UNION ALL
SELECT 'operational_data',table_name,
       CASE WHEN row_count=0 THEN 'PASS' ELSE 'FAIL' END,
       format('rows=%s',row_count)
FROM operational_counts
ORDER BY section,item;
