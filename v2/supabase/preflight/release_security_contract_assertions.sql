-- Read-only release security contract assertions. Intended for TEST replay and preflight.
WITH fn AS (
  SELECT p.proname, lower(pg_get_functiondef(p.oid)) AS body
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('handle_new_auth_user', 'is_active_user', 'is_admin', 'is_admin_or_manager')
),
pol AS (
  SELECT tablename, policyname, cmd,
         lower(coalesce(qual, '')) AS qual,
         lower(coalesce(with_check, '')) AS chk
  FROM pg_policies
  WHERE schemaname = 'public'
),
checks AS (
  SELECT 'signup trigger sets inactive pending email' AS check_name,
    coalesce((SELECT body LIKE '%active, membership_status, email%'
      AND body LIKE '%false%' AND body LIKE '%pending%'
      FROM fn WHERE proname = 'handle_new_auth_user'), false) AS passed
  UNION ALL
  SELECT 'active user requires approved membership',
    coalesce((SELECT body LIKE '%membership_status = ''approved''%'
      FROM fn WHERE proname = 'is_active_user'), false)
  UNION ALL
  SELECT 'admin helper requires approved membership',
    coalesce((SELECT body LIKE '%membership_status = ''approved''%'
      FROM fn WHERE proname = 'is_admin'), false)
  UNION ALL
  SELECT 'admin or manager helper requires approved membership',
    coalesce((SELECT body LIKE '%membership_status = ''approved''%'
      FROM fn WHERE proname = 'is_admin_or_manager'), false)
  UNION ALL
  SELECT 'class bookings read is scoped to own member or staff',
    coalesce((SELECT bool_and(qual LIKE '%member_id%' AND qual LIKE '%auth.uid%'
      AND qual NOT LIKE '%status = ''confirmed''%')
      FROM pol WHERE tablename = 'class_bookings' AND cmd = 'SELECT'), false)
  UNION ALL
  SELECT 'PT session read separates public and client-linked sessions',
    coalesce((SELECT bool_and(qual LIKE '%client_id is null%'
      AND qual LIKE '%app_private.is_pt_coach_for_member%')
      FROM pol WHERE tablename = 'pt_sessions' AND cmd = 'SELECT'), false)
  UNION ALL
  SELECT 'PT session exercise read is client-aware',
    coalesce((SELECT bool_and(qual LIKE '%client_id is null%')
      FROM pol WHERE tablename = 'pt_session_exercises' AND cmd = 'SELECT'), false)
  UNION ALL
  SELECT 'member class read restricted to published classes',
    coalesce((SELECT bool_and(qual LIKE '%published%')
      FROM pol WHERE tablename = 'classes' AND cmd = 'SELECT'), false)
)
SELECT check_name, passed FROM checks ORDER BY check_name;

SELECT CASE WHEN bool_and(passed) THEN 't' ELSE 'f' END AS release_security_contract_passed
FROM (
  WITH fn AS (
    SELECT p.proname, lower(pg_get_functiondef(p.oid)) AS body
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('handle_new_auth_user', 'is_active_user', 'is_admin', 'is_admin_or_manager')
  ),
  pol AS (
    SELECT tablename, cmd, lower(coalesce(qual, '')) AS qual
    FROM pg_policies WHERE schemaname = 'public'
  )
  SELECT coalesce((SELECT body LIKE '%active, membership_status, email%' AND body LIKE '%false%' AND body LIKE '%pending%' FROM fn WHERE proname='handle_new_auth_user'), false) passed
  UNION ALL SELECT coalesce((SELECT body LIKE '%membership_status = ''approved''%' FROM fn WHERE proname='is_active_user'), false)
  UNION ALL SELECT coalesce((SELECT body LIKE '%membership_status = ''approved''%' FROM fn WHERE proname='is_admin'), false)
  UNION ALL SELECT coalesce((SELECT body LIKE '%membership_status = ''approved''%' FROM fn WHERE proname='is_admin_or_manager'), false)
  UNION ALL SELECT coalesce((SELECT bool_and(qual LIKE '%member_id%' AND qual LIKE '%auth.uid%' AND qual NOT LIKE '%status = ''confirmed''%') FROM pol WHERE tablename='class_bookings' AND cmd='SELECT'), false)
  UNION ALL SELECT coalesce((SELECT bool_and(qual LIKE '%client_id is null%' AND qual LIKE '%app_private.is_pt_coach_for_member%') FROM pol WHERE tablename='pt_sessions' AND cmd='SELECT'), false)
  UNION ALL SELECT coalesce((SELECT bool_and(qual LIKE '%client_id is null%') FROM pol WHERE tablename='pt_session_exercises' AND cmd='SELECT'), false)
  UNION ALL SELECT coalesce((SELECT bool_and(qual LIKE '%published%') FROM pol WHERE tablename='classes' AND cmd='SELECT'), false)
) release_checks;
