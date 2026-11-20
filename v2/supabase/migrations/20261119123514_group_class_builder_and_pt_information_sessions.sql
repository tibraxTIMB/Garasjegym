
alter table public.classes
  add column if not exists prep_text text not null default '',
  add column if not exists main_text text not null default '',
  add column if not exists finish_text text not null default '',
  add column if not exists coach_notes text not null default '';

alter table public.pt_program_sessions
  drop constraint if exists pt_program_sessions_session_kind_check;
alter table public.pt_program_sessions
  add constraint pt_program_sessions_session_kind_check
  check (session_kind = any (array['training','recovery','rest','assessment','information']::text[]));

create index if not exists pt_program_sessions_kind_idx
  on public.pt_program_sessions(program_id, session_kind, sequence_no);
