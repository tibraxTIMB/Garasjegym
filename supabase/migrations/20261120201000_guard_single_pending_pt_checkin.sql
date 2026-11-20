-- The member workspace currently presents one pending check-in at a time.
-- Enforce that invariant at the database boundary as well as in the PT UI.
CREATE UNIQUE INDEX IF NOT EXISTS pt_checkins_one_pending_per_member_uidx
  ON public.pt_checkins (member_id)
  WHERE status = 'pending';
