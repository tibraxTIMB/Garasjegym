alter table public.member_preferences
  add column if not exists hr_enabled boolean not null default false,
  add column if not exists hr_share_with_pt boolean not null default false,
  add column if not exists hr_share_on_screen boolean not null default false,
  add column if not exists hr_save_history boolean not null default false;

comment on column public.member_preferences.hr_enabled is
  'Member opt-in to use a Bluetooth heart-rate sensor during workouts.';
comment on column public.member_preferences.hr_share_with_pt is
  'Member default preference; per-session consent is still required before sharing.';
comment on column public.member_preferences.hr_share_on_screen is
  'Member default preference; per-session consent is still required before public display.';
comment on column public.member_preferences.hr_save_history is
  'Member opt-in to persist heart-rate workout history.';
