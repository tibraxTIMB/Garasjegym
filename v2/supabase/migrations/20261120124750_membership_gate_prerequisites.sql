-- Membership-gate schema prerequisites.
-- These columns must exist before later migrations replace staff helper functions
-- with predicates that reference profiles.membership_status.
-- Existing active profiles are preserved as approved. Future inserts fail closed.
BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
  ALTER COLUMN active SET DEFAULT false,
  ALTER COLUMN membership_status SET DEFAULT 'pending';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_membership_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_membership_status_check
  CHECK (membership_status IN ('pending','approved','rejected'));

UPDATE public.profiles p
SET email = u.email,
    membership_status = CASE WHEN p.active THEN 'approved' ELSE 'pending' END
FROM auth.users u
WHERE u.id = p.id;

CREATE INDEX IF NOT EXISTS profiles_membership_status_created_idx
  ON public.profiles(membership_status, created_at DESC);

COMMENT ON COLUMN public.profiles.membership_status IS
  'Membership approval state: pending, approved, or rejected. New profiles default to pending.';
COMMENT ON COLUMN public.profiles.email IS
  'Email address synchronized from the linked Supabase Auth user.';

COMMIT;
