alter table public.exercises
  add column if not exists prescription_profiles jsonb not null default '{}'::jsonb;

alter table public.exercises
  drop constraint if exists exercises_prescription_profiles_object_check;

alter table public.exercises
  add constraint exercises_prescription_profiles_object_check
  check (jsonb_typeof(prescription_profiles) = 'object');

comment on column public.exercises.prescription_profiles is
  'Exercise-specific default loading profiles by equipment and movement variant. Each profile stores independent RX, Scaled and Foundation prescriptions for men and women; values are configured by coaches, never inferred from another exercise.';
