\set ON_ERROR_STOP on
\i v2/supabase/candidates/owner_first_signup_bootstrap_gate.sql

DO $assert$
DECLARE
  v_owner uuid;
  v_other uuid;
  v_rejected boolean;
BEGIN
  v_rejected := false;
  BEGIN
    INSERT INTO auth.users(email) VALUES ('unapproved@example.net');
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;
  IF NOT v_rejected OR (SELECT count(*) FROM auth.users) <> 0 THEN
    RAISE EXCEPTION 'Unapproved first signup was not rejected';
  END IF;

  INSERT INTO auth.users(email) VALUES ('tibrakestad@gmail.com') RETURNING id INTO v_owner;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_owner AND role='member' AND active=false AND membership_status='pending') THEN
    RAISE EXCEPTION 'Unconfirmed owner must remain pending';
  END IF;

  v_rejected := false;
  BEGIN
    INSERT INTO auth.users(email) VALUES ('racing@example.net');
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;
  IF NOT v_rejected OR (SELECT count(*) FROM auth.users) <> 1 THEN
    RAISE EXCEPTION 'Another signup bypassed pending-owner gate';
  END IF;

  UPDATE auth.users SET email_confirmed_at=now() WHERE id=v_owner;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_owner AND role='admin' AND active=true AND membership_status='approved') THEN
    RAISE EXCEPTION 'Verified owner was not promoted to admin';
  END IF;

  INSERT INTO auth.users(email) VALUES ('member@example.net') RETURNING id INTO v_other;
  UPDATE auth.users SET email_confirmed_at=now() WHERE id=v_other;
  IF (SELECT count(*) FROM public.profiles WHERE role='admin' AND active=true) <> 1
     OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_other AND role='member' AND active=false) THEN
    RAISE EXCEPTION 'Non-owner account acquired admin or active access';
  END IF;

  IF has_function_privilege('anon','app_private.guard_first_owner_registration()','EXECUTE')
    OR has_function_privilege('authenticated','app_private.promote_verified_first_owner()','EXECUTE') THEN
    RAISE EXCEPTION 'Clients can execute privileged signup triggers directly';
  END IF;

  RAISE NOTICE 'OWNER_FIRST_SIGNUP_POSTGRES17_ASSERTIONS_PASSED';
END;
$assert$;
