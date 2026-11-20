-- Read-only clean-start preflight. Does not modify any data.
-- Run only against the isolated full-schema restore after migrations are rehearsed.
-- Returns aggregate counts only; no member PII or secrets.

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
    ('coffee_settings','retain_safe_singleton'),
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
  SELECT count(*) FILTER (WHERE created_by IS NULL) AS standard_count,
         count(*) FILTER (WHERE created_by IS NOT NULL) AS custom_count,
         count(*) FILTER (WHERE created_by IS NULL AND category='CrossFit') AS crossfit_count,
         count(*) FILTER (WHERE created_by IS NULL AND category='Pilates') AS pilates_count,
         count(*) FILTER (WHERE created_by IS NULL AND category='Styrke') AS styrke_count
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
)
SELECT 'schema_table' AS section,
       table_name AS item,
       CASE WHEN exists_in_schema THEN 'present' ELSE 'MISSING' END AS status,
       retain_policy AS detail
FROM table_inventory
UNION ALL
SELECT 'exercise_baseline','standard_exercises',
       CASE WHEN standard_count=56 AND crossfit_count=30 AND pilates_count=15 AND styrke_count=11
            THEN 'PASS' ELSE 'CHECK' END,
       format('standard=%s CrossFit=%s Pilates=%s Styrke=%s custom=%s',
              standard_count,crossfit_count,pilates_count,styrke_count,custom_count)
FROM exercise_baseline
UNION ALL
SELECT 'profile_state','owner_admin_count',
       CASE WHEN active_approved_admins=1 THEN 'PASS' ELSE 'CHECK' END,
       format('profiles=%s admins=%s managers=%s members=%s non_approved_or_inactive=%s',
              profile_count,active_approved_admins,managers,members,not_active_approved)
FROM profile_state
UNION ALL
SELECT 'auth_linkage','auth_profile_links',
       CASE WHEN auth_user_count=auth_users_with_profile AND auth_users_without_profile=0
                 AND profile_rows_without_auth_user=0
            THEN 'PASS' ELSE 'CHECK' END,
       format('auth_users=%s linked=%s auth_without_profile=%s profile_without_auth=%s',
              auth_user_count,auth_users_with_profile,auth_users_without_profile,profile_rows_without_auth_user)
FROM auth_linkage CROSS JOIN orphan_profiles
UNION ALL
SELECT 'retained_configuration','coffee_settings_count',
       CASE WHEN count(*)=1 THEN 'PASS' ELSE 'CHECK' END,
       format('rows=%s',count(*))
FROM public.coffee_settings
ORDER BY section,item;
