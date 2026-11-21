-- Disposable CI smoke test for the guarded owner-admin bootstrap template.
-- Uses a synthetic, email-confirmed Auth identity inside a transaction and rolls
-- everything back. Never touches a real owner account or persistent database state.
BEGIN;

DO $owner_fixture$
DECLARE
  v_user_id uuid := 'f2000000-0000-4000-8000-000000000002';
  v_email text := 'sturmkopf-ci-owner@example.invalid';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users)
     OR EXISTS (SELECT 1 FROM public.profiles)
     OR EXISTS (SELECT 1 FROM auth.identities) THEN
    RAISE EXCEPTION 'Owner bootstrap smoke test requires an empty Auth/profile target';
  END IF;

  INSERT INTO auth.users(
    id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at
  ) VALUES (
    v_user_id,'authenticated','authenticated',v_email,'',now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"CI Owner Bootstrap"}'::jsonb,
    now(),now()
  );

  INSERT INTO auth.identities(
    provider_id,user_id,identity_data,provider,email,created_at,updated_at
  ) VALUES (
    v_email,v_user_id,
    jsonb_build_object('sub',v_user_id::text,'email',v_email),
    'email',v_email,now(),now()
  );
END;
$owner_fixture$;

\ir owner_admin_bootstrap_isolated_rehearsal.sql

DO $owner_assert$
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 1
     OR (SELECT count(*) FROM auth.identities) <> 1
     OR (SELECT count(*) FROM public.profiles) <> 1
     OR NOT EXISTS (
       SELECT 1
       FROM auth.users u
       JOIN auth.identities i ON i.user_id=u.id AND i.provider='email'
       JOIN public.profiles p ON p.id=u.id
       WHERE p.role='admin'
         AND p.active=true
         AND p.membership_status='approved'
         AND p.email=u.email
         AND u.email_confirmed_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Owner admin bootstrap smoke test failed';
  END IF;
END;
$owner_assert$;

ROLLBACK;
