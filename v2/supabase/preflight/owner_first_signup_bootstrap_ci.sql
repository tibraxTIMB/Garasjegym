\set ON_ERROR_STOP on
-- This must never change a live or local database permanently.
BEGIN;
\i v2/supabase/candidates/owner_first_signup_bootstrap_gate.sql

DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND t.tgname = 'sturmkopf_guard_first_owner_registration'
      AND NOT t.tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'auth.users'::regclass
      AND t.tgname = 'sturmkopf_promote_verified_first_owner'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Owner first-registration triggers missing';
  END IF;

  IF has_function_privilege('anon', 'app_private.guard_first_owner_registration()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'app_private.guard_first_owner_registration()', 'EXECUTE')
     OR has_function_privilege('anon', 'app_private.promote_verified_first_owner()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'app_private.promote_verified_first_owner()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Owner bootstrap trigger functions must not be directly callable by clients';
  END IF;
END;
$verify$;

ROLLBACK;
