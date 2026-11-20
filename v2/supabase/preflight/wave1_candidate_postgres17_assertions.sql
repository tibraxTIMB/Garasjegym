-- Assertions after applying the candidate in the disposable PostgreSQL 17 fixture.
DO $checks$
DECLARE
  v_count bigint;
  v_default text;
BEGIN
  SELECT count(*) INTO v_count FROM public.profiles;
  IF v_count <> 3 THEN RAISE EXCEPTION 'Expected 3 existing profiles, got %',v_count; END IF;
  IF (SELECT count(*) FROM public.profiles WHERE membership_status='approved' AND active) <> 3 THEN
    RAISE EXCEPTION 'Existing active profiles were not preserved as approved';
  END IF;
  IF (SELECT count(*) FROM public.profiles WHERE role='admin') <> 1
     OR (SELECT count(*) FROM public.profiles WHERE role='member') <> 2 THEN
    RAISE EXCEPTION 'Existing profile roles changed';
  END IF;
  SELECT column_default INTO v_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles' AND column_name='active';
  IF v_default NOT LIKE '%false%' THEN RAISE EXCEPTION 'active default is not false: %',v_default; END IF;
  SELECT column_default INTO v_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='profiles' AND column_name='membership_status';
  IF v_default NOT LIKE '%pending%' THEN RAISE EXCEPTION 'membership default is not pending: %',v_default; END IF;
  IF has_column_privilege('authenticated','public.profiles','email','UPDATE') THEN
    RAISE EXCEPTION 'authenticated unexpectedly has UPDATE on email';
  END IF;
  IF NOT has_column_privilege('authenticated','public.profiles','display_name','UPDATE') THEN
    RAISE EXCEPTION 'authenticated is missing intended display_name UPDATE';
  END IF;
  IF has_table_privilege('anon','public.profiles','SELECT') THEN
    RAISE EXCEPTION 'anon unexpectedly has SELECT on profiles';
  END IF;
  IF has_function_privilege('anon','public.is_active_user()','EXECUTE')
     OR has_function_privilege('anon','public.is_admin()','EXECUTE')
     OR has_function_privilege('anon','public.is_admin_or_manager()','EXECUTE') THEN
    RAISE EXCEPTION 'anon unexpectedly can execute membership helper';
  END IF;
END;
$checks$;

-- A fresh signup must create member + inactive + pending.
INSERT INTO auth.users(id,email,raw_user_meta_data)
VALUES ('00000000-0000-0000-0000-000000000004','pending@example.test','{"display_name":"Pending"}');

DO $signup$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id='00000000-0000-0000-0000-000000000004'
      AND role='member' AND active=false AND membership_status='pending'
      AND email='pending@example.test'
  ) THEN
    RAISE EXCEPTION 'Signup trigger did not create inactive pending member';
  END IF;
END;
$signup$;

-- Pending users may read their own profile for the waiting screen, but no member data.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
DO $pending$
DECLARE v_rows bigint;
BEGIN
  IF public.is_active_user() OR public.is_admin() OR public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Pending user has authorization';
  END IF;
  SELECT count(*) INTO v_rows FROM public.profiles;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'Pending user can read % profiles instead of own row only',v_rows; END IF;
END;
$pending$;
RESET ROLE;

-- Re-running the signup trigger for an existing profile may synchronize email
-- only; it must not overwrite the user's role, active state, approval or name.
CREATE TEMP TABLE auth_signup_conflict_probe (
  id uuid,
  email text,
  raw_user_meta_data jsonb
);
CREATE TRIGGER on_signup_conflict_probe
AFTER INSERT ON auth_signup_conflict_probe
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
INSERT INTO auth_signup_conflict_probe(id,email,raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'synced-member@example.test',
  '{"display_name":"Must Not Replace Existing Name"}'
);
DO $conflict$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id='00000000-0000-0000-0000-000000000002'
      AND email='synced-member@example.test'
      AND display_name='Member One'
      AND role='member'
      AND active=true
      AND membership_status='approved'
  ) THEN
    RAISE EXCEPTION 'Signup conflict path changed protected profile fields';
  END IF;
END;
$conflict$;

-- An admin can promote an existing member to manager in the isolated target.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
DO $admin_setup$
BEGIN
  IF NOT public.is_active_user() OR NOT public.is_admin() OR NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Existing admin lost approved staff access';
  END IF;
  UPDATE public.profiles SET role='manager'
  WHERE id='00000000-0000-0000-0000-000000000003';
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000003' AND role='manager') THEN
    RAISE EXCEPTION 'Admin could not promote test manager';
  END IF;
  UPDATE public.profiles SET membership_status='approved',active=true
  WHERE id='00000000-0000-0000-0000-000000000004';
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id='00000000-0000-0000-0000-000000000004' AND membership_status='approved' AND active) THEN
    RAISE EXCEPTION 'Admin could not approve pending member';
  END IF;
END;
$admin_setup$;
RESET ROLE;

-- Manager may edit another approved member's display name, but cannot self-edit
-- or change a member's role, approval state or active state.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
DO $manager$
DECLARE
  v_rows bigint;
BEGIN
  IF NOT public.is_active_user() OR NOT public.is_admin_or_manager() OR public.is_admin() THEN
    RAISE EXCEPTION 'Manager helper state is incorrect';
  END IF;
  SELECT count(*) INTO v_rows FROM public.profiles;
  IF v_rows <> 4 THEN RAISE EXCEPTION 'Manager should see all 4 profiles, got %',v_rows; END IF;

  UPDATE public.profiles SET display_name='Self-edit must not apply'
  WHERE id=auth.uid();
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN RAISE EXCEPTION 'Manager edited own profile'; END IF;

  UPDATE public.profiles SET display_name='Member One Updated'
  WHERE id='00000000-0000-0000-0000-000000000002';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'Manager could not edit another approved member'; END IF;

  BEGIN
    UPDATE public.profiles SET role='admin'
    WHERE id='00000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'Manager role escalation unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.profiles SET active=false
    WHERE id='00000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'Manager deactivation unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.profiles SET membership_status='pending'
    WHERE id='00000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'Manager membership change unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    UPDATE public.profiles SET email='manager-change@example.test'
    WHERE id='00000000-0000-0000-0000-000000000002';
    RAISE EXCEPTION 'Manager email update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$manager$;
RESET ROLE;

-- A normal approved member sees only their own profile and is not staff.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
DO $member$
DECLARE
  v_rows bigint;
BEGIN
  IF NOT public.is_active_user() THEN RAISE EXCEPTION 'Approved member is not active'; END IF;
  IF public.is_admin() OR public.is_admin_or_manager() THEN RAISE EXCEPTION 'Member has staff privilege'; END IF;
  SELECT count(*) INTO v_rows FROM public.profiles;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'Member can see % profiles instead of own row only',v_rows; END IF;
END;
$member$;
RESET ROLE;

-- Pending, rejected and inactive users may hold Auth sessions but have no
-- member authorization. Admin creates rejected/inactive test states.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
DO $admin_final$
BEGIN
  UPDATE public.profiles
  SET membership_status='rejected',active=false
  WHERE id='00000000-0000-0000-0000-000000000004';
  UPDATE public.profiles
  SET membership_status='approved',active=false
  WHERE id='00000000-0000-0000-0000-000000000002';
END;
$admin_final$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
DO $rejected$
DECLARE v_rows bigint;
BEGIN
  IF public.is_active_user() OR public.is_admin() OR public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Rejected user has authorization';
  END IF;
  SELECT count(*) INTO v_rows FROM public.profiles;
  IF v_rows <> 1 THEN RAISE EXCEPTION 'Rejected user can read another profile'; END IF;
END;
$rejected$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
DO $inactive$
BEGIN
  IF public.is_active_user() THEN RAISE EXCEPTION 'Inactive approved user has member authorization'; END IF;
END;
$inactive$;
RESET ROLE;

-- A direct profile insert that omits active/status must also fail closed.
BEGIN;
INSERT INTO public.profiles(id,display_name)
VALUES ('00000000-0000-0000-0000-000000000099','Default Check');
DO $defaults$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id='00000000-0000-0000-0000-000000000099'
      AND active=false AND membership_status='pending'
  ) THEN
    RAISE EXCEPTION 'Direct profile insert did not default to inactive/pending';
  END IF;
END;
$defaults$;
ROLLBACK;

SELECT 'WAVE1_POSTGRES17_CANDIDATE_TESTS_PASSED' AS result;

-- Cross-member privacy regression: member A cannot read member B's booking
-- or client-linked published PT session; public unassigned PT slot remains visible.
UPDATE public.profiles
SET active=true,membership_status='approved',role='member'
WHERE id IN ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
DO $privacy_member$
DECLARE v_bookings bigint; v_sessions bigint;
BEGIN
  SELECT count(*) INTO v_bookings FROM public.class_bookings;
  SELECT count(*) INTO v_sessions FROM public.pt_sessions;
  IF v_bookings <> 0 THEN
    RAISE EXCEPTION 'PRIVACY FAILURE: member A can read % of member B confirmed bookings',v_bookings;
  END IF;
  IF v_sessions <> 1 THEN
    RAISE EXCEPTION 'PRIVACY FAILURE: member A sees % PT sessions; expected only the unassigned public slot',v_sessions;
  END IF;
END;
$privacy_member$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
DO $privacy_admin$
DECLARE v_bookings bigint; v_sessions bigint;
BEGIN
  SELECT count(*) INTO v_bookings FROM public.class_bookings;
  SELECT count(*) INTO v_sessions FROM public.pt_sessions;
  IF v_bookings <> 1 OR v_sessions <> 2 THEN
    RAISE EXCEPTION 'Staff visibility regression: expected 1 booking and 2 sessions, got % and %',v_bookings,v_sessions;
  END IF;
END;
$privacy_admin$;
RESET ROLE;
SELECT 'WAVE2_RLS_PRIVACY_TESTS_PASSED' AS result;
