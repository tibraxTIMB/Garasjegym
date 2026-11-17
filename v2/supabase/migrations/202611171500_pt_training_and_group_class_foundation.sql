alter table public.pt_sessions add column if not exists session_type text not null default 'guided';
alter table public.pt_sessions add column if not exists coach_notes text not null default '';
alter table public.pt_sessions add column if not exists completed_notes text not null default '';
alter table public.pt_sessions add column if not exists attendance_status text not null default 'scheduled';
alter table public.classes add column if not exists instructor_id uuid references public.profiles(id) on delete set null;
alter table public.classes add column if not exists published boolean not null default true;
create table if not exists public.pt_wod_assignments (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id) on delete cascade,
 wod_id uuid not null references public.wods(id) on delete cascade,
 assigned_by uuid not null references public.profiles(id),
 linked_session_id uuid references public.pt_sessions(id) on delete set null,
 due_date date,
 location text not null default 'Valfritt',
 coach_note text not null default '',
 status text not null default 'assigned' check(status in ('assigned','in_progress','completed','cancelled')),
 workout_log_id uuid references public.workout_logs(id) on delete set null,
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists pt_wod_assignments_member_status_idx on public.pt_wod_assignments(member_id,status,due_date);
create index if not exists pt_wod_assignments_session_idx on public.pt_wod_assignments(linked_session_id);
alter table public.pt_wod_assignments enable row level security;
drop policy if exists pt_wod_assignments_read_own_or_staff on public.pt_wod_assignments;
create policy pt_wod_assignments_read_own_or_staff on public.pt_wod_assignments for select to authenticated using(member_id=auth.uid() or public.is_admin_or_manager());
drop policy if exists pt_wod_assignments_staff_insert on public.pt_wod_assignments;
create policy pt_wod_assignments_staff_insert on public.pt_wod_assignments for insert to authenticated with check(public.is_admin_or_manager() and assigned_by=auth.uid());
drop policy if exists pt_wod_assignments_staff_update on public.pt_wod_assignments;
create policy pt_wod_assignments_staff_update on public.pt_wod_assignments for update to authenticated using(public.is_admin_or_manager() or member_id=auth.uid()) with check(public.is_admin_or_manager() or member_id=auth.uid());
grant select,insert,update on public.pt_wod_assignments to authenticated;