CREATE UNIQUE INDEX IF NOT EXISTS pt_checkins_one_pending_per_member_uidx
  ON public.pt_checkins (member_id)
  WHERE status = 'pending';