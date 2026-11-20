-- Keep the PT Studio profile schema compatible with the release client.
-- member_rank is optional display metadata; existing members remain unchanged.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_rank text;

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_member_rank_length_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_member_rank_length_check
      CHECK (member_rank IS NULL OR char_length(member_rank) <= 40);
  END IF;
END;
$migration$;

GRANT SELECT (member_rank) ON public.profiles TO authenticated;
