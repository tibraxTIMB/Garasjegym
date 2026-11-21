-- REVIEWED CANDIDATE ONLY; NOT AN INSTALLED MIGRATION.
-- Supabase project must have email confirmation ENABLED before deployment.
-- Designed for a clean-start project with no Auth users after owner-approved
-- old-account removal. Only tibrakestad@gmail.com may register first.
-- No user_meta_data is used for authorization. The new owner remains pending
-- until Supabase Auth confirms email and updates auth.users.email_confirmed_at.
-- Requires the existing public.handle_new_auth_user() signup profile trigger.

CREATE SCHEMA IF NOT EXISTS app_private;

CREATE OR REPLACE FUNCTION app_private.guard_first_owner_registration()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $gate$
DECLARE
  v_auth_users bigint;
  v_approved_admins bigint;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(25112026, 117);

  SELECT count(*) INTO v_auth_users FROM auth.users;
  SELECT count(*) INTO v_approved_admins FROM public.profiles
   WHERE role='admin' AND active=true AND membership_status='approved';

  IF v_approved_admins = 0 THEN
    IF v_auth_users > 0 THEN
      RAISE EXCEPTION 'Eigarregistrering er reservert. Stadfest den første eigarkontoen før nye brukarar blir oppretta.';
    END IF;
    IF lower(trim(coalesce(NEW.email,''))) <> 'tibrakestad@gmail.com' THEN
      RAISE EXCEPTION 'Den første kontoen må opprettast av den førehandsgodkjende eigaren.';
    END IF;
    IF NEW.is_anonymous IS TRUE OR NEW.email IS NULL THEN
      RAISE EXCEPTION 'Eigarregistrering krev ein ordinær e-postkonto.';
    END IF;
  END IF;

  RETURN NEW;
END;
$gate$;

DROP TRIGGER IF EXISTS sturmkopf_guard_first_owner_registration ON auth.users;
CREATE TRIGGER sturmkopf_guard_first_owner_registration
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION app_private.guard_first_owner_registration();

CREATE OR REPLACE FUNCTION app_private.promote_verified_first_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $promote$
DECLARE
  v_updated bigint;
BEGIN
  -- Deliberately NOT triggered by initial insert. A Supabase project with
  -- email confirmation disabled will fail closed instead of granting admin.
  IF OLD.email_confirmed_at IS NOT NULL OR NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF lower(trim(coalesce(NEW.email,''))) <> 'tibrakestad@gmail.com' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(25112026, 117);
  IF (SELECT count(*) FROM auth.users) <> 1 THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE role='admin' AND active=true) THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET role='admin', active=true, membership_status='approved',
      updated_at=pg_catalog.now()
  WHERE id=NEW.id AND role='member' AND active=false
    AND membership_status='pending'
    AND lower(trim(coalesce(email,'')))='tibrakestad@gmail.com';
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Eigarbekrefting feila: venta éin pending medlemsprofil, fekk %',v_updated;
  END IF;
  RETURN NEW;
END;
$promote$;

DROP TRIGGER IF EXISTS sturmkopf_promote_verified_first_owner ON auth.users;
CREATE TRIGGER sturmkopf_promote_verified_first_owner
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION app_private.promote_verified_first_owner();

REVOKE ALL ON FUNCTION app_private.guard_first_owner_registration() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.promote_verified_first_owner() FROM PUBLIC, anon, authenticated;
