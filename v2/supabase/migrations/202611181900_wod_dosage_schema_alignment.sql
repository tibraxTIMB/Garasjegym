-- Align live WOD builder fields with the application schema.
alter table public.wods
  add column if not exists timer_settings jsonb not null
  default '{"work_seconds":60,"rest_seconds":0,"rounds":5}'::jsonb;

alter table public.wods
  drop constraint if exists wods_timer_settings_object_check;
alter table public.wods
  add constraint wods_timer_settings_object_check
  check (jsonb_typeof(timer_settings) = 'object');

comment on column public.wods.timer_settings is
  'Timer defaults and structured workout_schema for each WOD.';

alter table public.exercises
  add column if not exists body_area text;
alter table public.exercises
  add column if not exists is_rehab boolean not null default false;

comment on column public.exercises.body_area is
  'Primary body area used for exercise-library filtering and workout analysis.';
comment on column public.exercises.is_rehab is
  'Marks a rehabilitation or physiotherapy exercise.';
