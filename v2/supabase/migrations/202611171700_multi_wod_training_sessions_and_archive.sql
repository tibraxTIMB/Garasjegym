alter table public.wods add column if not exists is_archived boolean not null default false;
create table if not exists public.training_sessions (
 id uuid primary key default gen_random_uuid(), name text not null,
 created_by uuid not null references public.profiles(id), member_id uuid references public.profiles(id),
 session_date date, notes text not null default '',
 status text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.training_session_wods (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.training_sessions(id) on delete cascade,
 wod_id uuid not null references public.wods(id) on delete restrict, sort_order integer not null default 0,
 created_at timestamptz not null default now(), unique(session_id,wod_id)
);
alter table public.training_sessions enable row level security;
alter table public.training_session_wods enable row level security;
create policy training_sessions_select_own_or_staff on public.training_sessions for select to authenticated using (member_id=auth.uid() or created_by=auth.uid() or is_admin_or_manager());
create policy training_sessions_insert_staff on public.training_sessions for insert to authenticated with check (created_by=auth.uid() and is_admin_or_manager());
create policy training_sessions_update_staff_or_owner on public.training_sessions for update to authenticated using (created_by=auth.uid() or member_id=auth.uid() or is_admin_or_manager()) with check (created_by=auth.uid() or member_id=auth.uid() or is_admin_or_manager());
create policy training_session_wods_select_parent on public.training_session_wods for select to authenticated using (exists(select 1 from public.training_sessions s where s.id=session_id and (s.member_id=auth.uid() or s.created_by=auth.uid() or is_admin_or_manager())));
create policy training_session_wods_manage_staff on public.training_session_wods for all to authenticated using (is_admin_or_manager()) with check (is_admin_or_manager());
grant select,insert,update on public.training_sessions to authenticated;
grant select,insert,update,delete on public.training_session_wods to authenticated;