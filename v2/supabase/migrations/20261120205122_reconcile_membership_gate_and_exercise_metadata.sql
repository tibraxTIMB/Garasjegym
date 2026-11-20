-- Reconcile member approval and exercise metadata objects that existed in the test schema
-- but were not represented as standalone migration records.
-- Use the current hardened function definitions and policies.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'approved';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_membership_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_membership_status_check
  CHECK (membership_status IN ('pending','approved','rejected'));

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND (p.email IS NULL OR p.email = '');

CREATE INDEX IF NOT EXISTS profiles_membership_status_created_idx
  ON public.profiles(membership_status, created_at DESC);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
begin
  insert into public.profiles (id, display_name, role, active, membership_status, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    'member',
    false,
    'pending',
    new.email
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.membership_status = 'approved'
  );
$function$;

DROP POLICY IF EXISTS profile_update_staff ON public.profiles;
CREATE POLICY profile_update_staff ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_admin_or_manager()
      AND role = 'member'
      AND id <> (SELECT auth.uid())
      AND membership_status = 'approved'
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_admin_or_manager()
      AND role = 'member'
      AND id <> (SELECT auth.uid())
      AND membership_status = 'approved'
    )
  );

GRANT SELECT(id,display_name,avatar_url,role,active,created_at,updated_at,email,membership_status)
  ON public.profiles TO authenticated;

COMMENT ON COLUMN public.exercises.body_area IS
  'Primary body area used for exercise-library filtering and workout analysis.';
COMMENT ON COLUMN public.exercises.is_rehab IS
  'Marks a rehabilitation or physiotherapy exercise.';
