-- OWNER-RUN BOOTSTRAP TEMPLATE – NOT A MIGRATION.
-- Execute ONLY on the isolated Production-derived clean-start rehearsal target.
-- Never run this on Production until a separate explicit final GO LIVE approval.
--
-- Before execution:
-- 1. Complete the clean-start reset on the isolated rehearsal target.
-- 2. Through Supabase Dashboard > Authentication, create exactly one new owner-controlled
--    email/password Auth user and complete email confirmation.
-- 3. Verify the displayed email is the intended owner account. This script deliberately
--    promotes the sole remaining pending Auth user; it cannot determine human ownership.
-- 4. Ensure no legacy Auth users, identities or profiles remain.
--
-- This updates only the new Auth user's profile. It does not create or change Auth
-- credentials, sessions, identities, app metadata, or passwords.

DO $owner_admin_bootstrap$
DECLARE
  v_user_id uuid;
  v_updated integer;
  v_auth_users bigint;
  v_profiles bigint;
  v_identities bigint;
BEGIN
  IF current_setting('app.clean_start_target', true) IS DISTINCT FROM 'isolated-rehearsal' THEN
    RAISE EXCEPTION 'Refusing owner bootstrap: app.clean_start_target must be isolated-rehearsal';
  END IF;

  SELECT count(*) INTO v_auth_users FROM auth.users;
  SELECT count(*) INTO v_profiles FROM public.profiles;
  SELECT count(*) INTO v_identities FROM auth.identities;

  IF v_auth_users <> 1 OR v_profiles <> 1 OR v_identities <> 1 THEN
    RAISE EXCEPTION
      'Unsafe owner bootstrap: expected exactly one Auth user, one profile and one identity; found users=%, profiles=%, identities=%',
      v_auth_users, v_profiles, v_identities;
  END IF;

  SELECT u.id
    INTO v_user_id
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  JOIN auth.identities i ON i.user_id = u.id
  WHERE u.email_confirmed_at IS NOT NULL
    AND i.provider = 'email'
    AND p.email = u.email
    AND p.role = 'member'
    AND p.active = false
    AND p.membership_status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'Unsafe owner bootstrap: sole Auth user must be email-confirmed and linked to one pending member profile with matching email';
  END IF;

  UPDATE public.profiles
  SET role = 'admin',
      active = true,
      membership_status = 'approved',
      updated_at = pg_catalog.now()
  WHERE id = v_user_id
    AND role = 'member'
    AND active = false
    AND membership_status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Owner bootstrap expected to promote exactly one profile; updated %', v_updated;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id
      AND role = 'admin'
      AND active = true
      AND membership_status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Owner bootstrap postcondition failed';
  END IF;

  RAISE NOTICE 'Owner admin profile bootstrapped for the sole confirmed Auth user. Verify login in the app before opening member signup.';
END;
$owner_admin_bootstrap$;
