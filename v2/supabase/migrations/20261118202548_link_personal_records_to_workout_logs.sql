alter table public.personal_records
  add column if not exists workout_log_id uuid
  references public.workout_logs(id) on delete set null;

create index if not exists personal_records_workout_log_id_idx
  on public.personal_records(workout_log_id);