alter table public.workout_logs
  add column if not exists score_time_seconds numeric,
  add column if not exists score_load_kg numeric,
  add column if not exists score_calories numeric,
  add column if not exists score_distance numeric,
  add column if not exists score_unit text;