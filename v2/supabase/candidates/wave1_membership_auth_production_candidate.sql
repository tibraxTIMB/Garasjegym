-- STURMKOPF FEUER 1.1 – Wave 1 production-specific Membership/Auth candidate.
--
-- STATUS: REVIEW / RESTORE-REHEARSAL ONLY. NOT AN INSTALLED MIGRATION.
-- This file is deliberately outside v2/supabase/migrations/ so CI/db push cannot
-- apply it automatically. Never apply to production from this branch.
--
-- Preconditions:
--   1. Complete encrypted production backup and isolated restore have passed.
--   2. Owner has verified Auth provider/signup settings and approved the release.
--   3. Re-run the SELECT-only membership_auth_wave_preflight_read_only.sql.
--   4. Confirm the three existing accounts are still exactly 1 admin + 2 members,
--      all active, and every Auth user has exactly one linked profile.
--   5. In the rehearsal session only, explicitly set:
--        SET app.sturmkopf_wave0_verified = 'true';
--      This guard is a workflow tripwire, not a substitute for owner approval.
--
-- Expected result: existing three profiles retain IDs, roles and active state;
-- existing active profiles become approved; all future profile inserts default
-- to inactive/pending; only admin can approve/reject or change roles.
--
-- This candidate also narrows UPDATE privileges to columns actually edited by
-- the V2 member/admin UI. Verify every deployed client before approving it.

BEGIN;
SET LOCAL lock_timeout = '5s';

DO $preflight$
DECLARE
  v_profiles bigint;
  v_active bigint;
  v_admins bigint;
  v_managers bigint;
  v_members bigint;
  v_auth_users bigint;
  v_orphan_profiles bigint;
  v_orphan_users bigint;
  v_missing_emails bigint;
  v_duplicate_email_groups bigint;
  v_auth_triggers bigint;
BEGIN
  IF current_setting('app.sturmkopf_wave0_verified', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'STOP: Wave 0 restore verification flag is not set for this isolated rehearsal session';
  END IF;

  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'STOP: public.profiles is missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles'
      AND column_name IN ('email','membership_status')
  ) THEN
    RAISE EXCEPTION 'STOP: membership/email columns already exist; this candidate is not a rerunnable migration';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE active),
         count(*) FILTER (WHERE active AND role='admin'),
         count(*) FILTER (WHERE active AND role='manager'),
         count(*) FILTER (WHERE active AND role='member')
    INTO v_profiles,v_active,v_admins,v_managers,v_members
  FROM public.profiles;

  SELECT count(*) INTO v_auth_users FROM auth.users;
  SELECT count(*) INTO v_orphan_profiles
  FROM public.profiles p LEFT JOIN auth.users u ON u.id=p.id WHERE u.id IS NULL;
  SELECT count(*) INTO v_orphan_users
  FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id WHERE p.id IS NULL;
  SELECT count(*) INTO v_missing_emails
  FROM auth.users WHERE email IS NULL OR btrim(email)='';
  SELECT count(*) INTO v_duplicate_email_groups
  FROM (
    SELECT lower(email) FROM auth.users
    WHERE email IS NOT NULL AND btrim(email)<>''
    GROUP BY lower(email) HAVING count(*)>1
  ) d;
  SELECT count(*) INTO v_auth_triggers
  FROM pg_trigger t
  JOIN pg_class c ON c.oid=t.tgrelid
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='auth' AND c.relname='users' AND NOT t.tgisinternal;

  IF (v_profiles,v_active,v_admins,v_managers,v_members,v_auth_users,
      v_orphan_profiles,v_orphan_users,v_missing_emails,v_duplicate_email_groups,
      v_auth_triggers)
     IS DISTINCT FROM (3::bigint,3::bigint,1::bigint,0::bigint,2::bigint,3::bigint,
                       0::bigint,0::bigint,0::bigint,0::bigint,1::bigint) THEN
    RAISE EXCEPTION
      'STOP: live data differs from approved B40 baseline. profiles %, active %, admins %, managers %, members %, auth users %, profile orphans %, auth orphans %, missing emails %, duplicate email groups %, Auth triggers %',
      v_profiles,v_active,v_admins,v_managers,v_members,v_auth_users,
      v_orphan_profiles,v_orphan_users,v_missing_emails,v_duplicate_email_groups,
      v_auth_triggers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='profiles' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'STOP: profiles RLS is not enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_proc p ON p.oid=t.tgfoid
    JOIN pg_namespace pn ON pn.oid=p.pronamespace
    WHERE n.nspname='auth' AND c.relname='users'
      AND t.tgname='on_auth_user_created'
      AND pn.nspname='public' AND p.proname='handle_new_auth_user'
      AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public, pg_temp']
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'STOP: expected SECURITY DEFINER Auth signup trigger/function/search_path differs';
  END IF;

  IF has_table_privilege('anon','public.profiles','SELECT') THEN
    RAISE EXCEPTION 'STOP: anon unexpectedly has SELECT on profiles';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='profile_select_own_or_staff' AND cmd='SELECT'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='profiles'
      AND policyname='profile_update_staff' AND cmd='UPDATE'
  ) THEN
    RAISE EXCEPTION 'STOP: expected production profile RLS policies are missing';
  END IF;
END;
$preflight$;

ALTER TABLE public.profiles
  ADD COLUMN email text,
  ADD COLUMN membership_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
  ALTER COLUMN active SET DEFAULT false,
  ALTER COLUMN membership_status SET DEFAULT 'pending';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_membership_status_check
  CHECK (membership_status IN ('pending','approved','rejected'));

-- The B40 baseline requires all three existing accounts to be active. Preserve
-- active and role values exactly; approval status is derived from that snapshot.
UPDATE public.profiles p
SET email = u.email,
    membership_status = CASE WHEN p.active THEN 'approved' ELSE 'pending' END
FROM auth.users u
WHERE u.id = p.id;

CREATE INDEX profiles_membership_status_created_idx
  ON public.profiles(membership_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.profiles
    (id, display_name, role, active, membership_status, email)
  VALUES
    (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
               split_part(COALESCE(NEW.email, ''), '@', 1)),
      'member',
      false,
      'pending',
      NEW.email
    )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.membership_status = 'approved'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.membership_status = 'approved'
      AND p.role = 'admin'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.active = true
      AND p.membership_status = 'approved'
      AND p.role IN ('admin','manager')
  );
$function$;

DROP POLICY profile_update_staff ON public.profiles;
CREATE POLICY profile_update_staff ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_admin_or_manager()
      AND role = 'member'
      AND id <> (SELECT auth.uid())
      AND active = true
      AND membership_status = 'approved'
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_admin_or_manager()
      AND role = 'member'
      AND id <> (SELECT auth.uid())
      AND active = true
      AND membership_status = 'approved'
    )
  );

-- Remove broad table-level UPDATE and grant only fields edited by the V2
-- member/admin UI. RLS still limits which rows each authenticated user can edit.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (display_name, role, active, membership_status)
  ON TABLE public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.membership_status IS
  'Membership approval state: pending, approved, or rejected. New profiles default to pending.';
COMMENT ON COLUMN public.profiles.email IS
  'Email address synchronized from the linked Supabase Auth user.';

COMMIT;
