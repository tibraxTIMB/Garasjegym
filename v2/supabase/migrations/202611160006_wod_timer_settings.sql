-- GarasjeGym 2.0: reusable timer configuration for WODs
-- Apply only after reviewing with the other v2 migrations.
alter table public.wods
  add column if not exists timer_settings jsonb not null
  default '{"work_seconds":60,"rest_seconds":0,"rounds":5}'::jsonb;

alter table public.wods
  drop constraint if exists wods_timer_settings_object_check;

alter table public.wods
  add constraint wods_timer_settings_object_check
  check (jsonb_typeof(timer_settings) = 'object');

comment on column public.wods.timer_settings is
  'Timer defaults for the WOD: work_seconds, rest_seconds and rounds. Members may adjust their timer while training.';
