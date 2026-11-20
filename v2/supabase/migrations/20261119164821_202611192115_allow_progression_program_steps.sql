-- Allow progression steps to use the existing PT program session table.
-- The progression metadata remains in workout_snapshot; WOD association stays optional.
alter table public.pt_program_sessions
  drop constraint if exists pt_program_sessions_session_kind_check;
alter table public.pt_program_sessions
  add constraint pt_program_sessions_session_kind_check
  check (session_kind = any (array[
    'training'::text,'recovery'::text,'rest'::text,'assessment'::text,
    'information'::text,'progression_step'::text
  ]));