-- Disposable full-Supabase signup trigger smoke test.
-- Runs inside a transaction and rolls back the synthetic Auth identity afterwards.
BEGIN;

DO $signup_test$
DECLARE
  v_user_id uuid := 'f1000000-0000-4000-8000-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id=v_user_id)
     OR EXISTS (SELECT 1 FROM public.profiles WHERE id=v_user_id) THEN
    RAISE EXCEPTION 'Synthetic signup fixture UUID already exists';
  END IF;

  INSERT INTO auth.users(
    id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) VALUES (
    v_user_id,'authenticated','authenticated',
    'sturmkopf-ci-pending@example.invalid','',now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"CI Pending Member"}'::jsonb,
    now(),now()
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id=v_user_id
      AND role='member'
      AND active=false
      AND membership_status='pending'
      AND email='sturmkopf-ci-pending@example.invalid'
  ) THEN
    RAISE EXCEPTION 'Auth signup trigger did not create an inactive pending member profile';
  END IF;

  PERFORM set_config('request.jwt.claim.sub',v_user_id::text,true);
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub',v_user_id::text,'role','authenticated')::text,
    true
  );

  IF public.is_active_user() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Pending signup unexpectedly passes is_active_user()';
  END IF;
  IF public.is_admin() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'New signup unexpectedly passes is_admin()';
  END IF;
  IF public.is_admin_or_manager() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'New signup unexpectedly passes is_admin_or_manager()';
  END IF;
END;
$signup_test$;

ROLLBACK;
