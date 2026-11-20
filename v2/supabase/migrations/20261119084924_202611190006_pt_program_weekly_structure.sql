
alter table public.pt_program_sessions
  add column if not exists week_no integer not null default 1 check (week_no between 1 and 52),
  add column if not exists day_no integer not null default 1 check (day_no between 1 and 7),
  add column if not exists session_kind text not null default 'training' check (session_kind in ('training','recovery','rest','assessment')),
  add column if not exists focus_area text not null default '',
  add column if not exists estimated_minutes integer check (estimated_minutes between 1 and 360);
create index if not exists pt_program_sessions_week_idx
  on public.pt_program_sessions(program_id,week_no,day_no,sequence_no);
