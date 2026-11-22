-- Read-only clean-start preflight. Does not modify any data.
-- Run against an isolated Production-derived restore after reviewed forward-only
-- schema/catalogue migrations, before rehearsing the reset.
-- The clean-start contract uses the reconciled exercise manifest, not the old
-- 56-row Production catalogue or the separate 94-row TEST snapshot.
-- Run exercise_catalogue_manifest_assertions.sql as the exact name-level check.
-- Legacy Auth/profile and operational rows are inventoried for the reset plan;
-- they are NOT expected to be retained in the clean-start result.

WITH expected_tables(table_name, retain_policy) AS (
  VALUES
    ('calendar_events','clear'),
    ('challenge_participants','clear'),
    ('challenges','clear'),
    ('class_bookings','clear'),
    ('class_live_sessions','clear'),
    ('class_session_wod_completions','clear'),
    ('classes','clear'),
    ('coffee_order_items','clear'),
    ('coffee_orders','clear'),
    ('coffee_product_reviews','clear'),
    ('coffee_products','clear'),
    ('coffee_settings','clear'),
    ('daily_wod','clear'),
    ('exercise_favorites','clear'),
    ('member_preferences','clear'),
    ('notifications','clear'),
    ('personal_records','clear'),
    ('pt_bookings','clear'),
    ('pt_checkins','clear'),
    ('pt_client_assignments','clear'),
    ('pt_client_goals','clear'),
    ('pt_client_notes','clear'),
    ('pt_coaches','clear'),
    ('pt_intakes','clear'),
    ('pt_messages','clear'),
    ('pt_program_sessions','clear'),
    ('pt_program_templates','clear'),
    ('pt_programs','clear'),
    ('pt_requests','clear'),
    ('pt_service_requests','clear'),
    ('pt_services','clear'),
    ('pt_session_exercises','clear'),
    ('pt_sessions','clear'),
    ('pt_wod_assignments','clear'),
    ('social_comments','clear'),
    ('social_posts','clear'),
    ('training_session_wods','clear'),
    ('training_sessions','clear'),
    ('wod_daily_schedules','clear'),
    ('wod_favorites','clear'),
    ('wods','clear'),
    ('workout_exercises','clear'),
    ('workout_logs','clear'),
    ('workout_sets','clear')
),
table_inventory AS (
  SELECT e.table_name,e.retain_policy,
         to_regclass(format('public.%I',e.table_name)) IS NOT NULL AS exists_in_schema
  FROM expected_tables e
),
exercise_baseline AS (
  SELECT count(*) FILTER (WHERE created_by IS NULL) AS system_exercise_count,
         count(*) FILTER (WHERE created_by IS NOT NULL) AS custom_count
  FROM public.exercises
),
profile_state AS (
  SELECT count(*) AS profile_count,
         count(*) FILTER (WHERE role='admin' AND active=true AND membership_status='approved') AS active_approved_admins,
         count(*) FILTER (WHERE role='manager') AS managers,
         count(*) FILTER (WHERE role='member') AS members,
         count(*) FILTER (WHERE active=false OR membership_status<>'approved') AS not_active_approved
  FROM public.profiles
),
auth_linkage AS (
  SELECT count(*) AS auth_user_count,
         count(*) FILTER (WHERE p.id IS NOT NULL) AS auth_users_with_profile,
         count(*) FILTER (WHERE p.id IS NULL) AS auth_users_without_profile
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id=u.id
),
orphan_profiles AS (
  SELECT count(*) AS profile_rows_without_auth_user
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id=p.id
  WHERE u.id IS NULL
),
auth_identity_state AS (
  SELECT count(*) AS identity_count,
         count(*) FILTER (WHERE i.user_id NOT IN (SELECT id FROM auth.users)) AS foreign_identities
  FROM auth.identities i
)
SELECT 'schema_table' AS section,
       table_name AS item,
       CASE WHEN exists_in_schema THEN 'present' ELSE 'MISSING' END AS status,
       retain_policy AS detail
FROM table_inventory
UNION ALL
SELECT 'exercise_catalogue','reconciled_manifest_count',
       CASE WHEN system_exercise_count=198 AND custom_count=0 THEN 'PASS' ELSE 'CHECK' END,
       format('system_catalog=%s/198 expanded_manifest custom_exercises=%s; exact names must also pass exercise_catalogue_manifest_assertions.sql',
              system_exercise_count,custom_count)
FROM exercise_baseline
UNION ALL
SELECT 'legacy_identity_inventory','profile_state','INVENTORY',
       format('pre-reset profiles=%s admins=%s managers=%s members=%s non_approved_or_inactive=%s; post-reset target: exactly one approved active admin and zero legacy profiles',
              profile_count,active_approved_admins,managers,members,not_active_approved)
FROM profile_state
UNION ALL
SELECT 'legacy_identity_inventory','auth_profile_links','INVENTORY',
       format('pre-reset auth_users=%s linked=%s auth_without_profile=%s profile_without_auth=%s; post-reset target: one new owner Auth user linked to one profile',
              auth_user_count,auth_users_with_profile,auth_users_without_profile,profile_rows_without_auth_user)
FROM auth_linkage CROSS JOIN orphan_profiles
UNION ALL
SELECT 'legacy_identity_inventory','auth_identity_state','INVENTORY',
       format('pre-reset identities=%s foreign_or_legacy_identities=%s; post-reset target: one new owner identity',
              identity_count,foreign_identities)
FROM auth_identity_state
UNION ALL
SELECT 'operational_data', table_name,
       CASE WHEN row_count=0 THEN 'PASS' ELSE 'CHECK' END,
       format('rows=%s',row_count)
FROM (
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
  UNION ALL SELECT 'storage.objects',count(*) FROM storage.objects
) operational_counts
ORDER BY section,item;
