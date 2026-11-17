alter table public.member_preferences
  add column if not exists last_seen_pt_wod_at timestamptz;
