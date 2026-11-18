-- PT Studio 2.0: intake, client goals, reusable intro plans and manual check-ins.
create table if not exists public.pt_intakes (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id) on delete cascade,
 goals text[] not null default '{}',
 primary_goal text not null default '',
 reason text not null,
 level text not null default 'Noko erfaring',
 frequency text not null default '',
 preferred_training text[] not null default '{}',
 avoid text not null default '',
 weekly_days integer not null default 3 check (weekly_days between 1 and 7),
 constraints text not null default '',
 commitment text not null default '',
 expectations text not null default '',
 desired_outcome text not null default '',
 status text not null default 'new' check (status in ('new','reviewed','archived')),
 reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists pt_intakes_member_created_idx on public.pt_intakes(member_id,created_at desc);
alter table public.pt_intakes enable row level security;
create policy pt_intakes_read_own_or_staff on public.pt_intakes for select to authenticated using(member_id=auth.uid() or public.is_admin_or_manager());
create policy pt_intakes_insert_own on public.pt_intakes for insert to authenticated with check(member_id=auth.uid() and status='new' and reviewed_by is null and reviewed_at is null);
create policy pt_intakes_staff_update on public.pt_intakes for update to authenticated using(public.is_admin_or_manager()) with check(public.is_admin_or_manager());
grant select,insert,update on public.pt_intakes to authenticated;

create table if not exists public.pt_client_goals (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id) on delete cascade,
 created_by uuid not null references public.profiles(id),
 area text not null,
 title text not null,
 baseline text not null default '',
 target text not null default '',
 unit text not null default '',
 target_date date,
 is_visible boolean not null default true,
 status text not null default 'active' check(status in ('active','achieved','paused')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists pt_client_goals_member_idx on public.pt_client_goals(member_id,status);
alter table public.pt_client_goals enable row level security;
create policy pt_client_goals_read on public.pt_client_goals for select to authenticated using((member_id=auth.uid() and is_visible) or public.is_admin_or_manager());
create policy pt_client_goals_staff_insert on public.pt_client_goals for insert to authenticated with check(public.is_admin_or_manager() and created_by=auth.uid());
create policy pt_client_goals_staff_update on public.pt_client_goals for update to authenticated using(public.is_admin_or_manager()) with check(public.is_admin_or_manager());
create policy pt_client_goals_staff_delete on public.pt_client_goals for delete to authenticated using(public.is_admin_or_manager());
grant select,insert,update,delete on public.pt_client_goals to authenticated;

create table if not exists public.pt_program_templates (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 description text not null default '',
 weeks integer not null default 6 check(weeks between 1 and 52),
 sessions_per_week integer not null default 3 check(sessions_per_week between 1 and 7),
 focus_areas text[] not null default '{}',
 sessions jsonb not null default '[]'::jsonb,
 is_active boolean not null default true,
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.pt_program_templates enable row level security;
create policy pt_program_templates_read_active on public.pt_program_templates for select to authenticated using(is_active or public.is_admin_or_manager());
create policy pt_program_templates_staff_insert on public.pt_program_templates for insert to authenticated with check(public.is_admin_or_manager() and created_by=auth.uid());
create policy pt_program_templates_staff_update on public.pt_program_templates for update to authenticated using(public.is_admin_or_manager()) with check(public.is_admin_or_manager());
grant select,insert,update on public.pt_program_templates to authenticated;

create table if not exists public.pt_programs (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.profiles(id) on delete cascade,
 template_id uuid references public.pt_program_templates(id) on delete set null,
 title text not null,
 description text not null default '',
 start_date date,
 weeks integer not null default 6,
 focus_areas text[] not null default '{}',
 status text not null default 'active' check(status in ('draft','active','completed','paused','cancelled')),
 created_by uuid not null references public.profiles(id),
 coach_notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists pt_programs_client_status_idx on public.pt_programs(client_id,status);
alter table public.pt_programs enable row level security;
create policy pt_programs_read_own_or_staff on public.pt_programs for select to authenticated using(client_id=auth.uid() or public.is_admin_or_manager());
create policy pt_programs_staff_insert on public.pt_programs for insert to authenticated with check(public.is_admin_or_manager() and created_by=auth.uid());
create policy pt_programs_staff_update on public.pt_programs for update to authenticated using(public.is_admin_or_manager()) with check(public.is_admin_or_manager());
grant select,insert,update on public.pt_programs to authenticated;

create table if not exists public.pt_program_sessions (
 id uuid primary key default gen_random_uuid(),
 program_id uuid not null references public.pt_programs(id) on delete cascade,
 sequence_no integer not null,
 title text not null,
 wod_id uuid references public.wods(id) on delete set null,
 scheduled_date date,
 workout_snapshot jsonb not null default '{}'::jsonb,
 coach_note text not null default '',
 status text not null default 'planned' check(status in ('planned','in_progress','completed','cancelled')),
 completed_at timestamptz,
 workout_log_id uuid references public.workout_logs(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(program_id,sequence_no)
);
create index if not exists pt_program_sessions_program_order_idx on public.pt_program_sessions(program_id,sequence_no);
alter table public.pt_program_sessions enable row level security;
create policy pt_program_sessions_read_parent on public.pt_program_sessions for select to authenticated using(exists(select 1 from public.pt_programs p where p.id=program_id and (p.client_id=auth.uid() or public.is_admin_or_manager())));
create policy pt_program_sessions_staff_insert on public.pt_program_sessions for insert to authenticated with check(public.is_admin_or_manager());
create policy pt_program_sessions_staff_update on public.pt_program_sessions for update to authenticated using(public.is_admin_or_manager()) with check(public.is_admin_or_manager());
create policy pt_program_sessions_member_complete on public.pt_program_sessions for update to authenticated using(status in ('planned','in_progress') and exists(select 1 from public.pt_programs p where p.id=program_id and p.client_id=auth.uid())) with check(status in ('completed','in_progress') and exists(select 1 from public.pt_programs p where p.id=program_id and p.client_id=auth.uid()));
revoke update on public.pt_program_sessions from authenticated;\ngrant select,insert on public.pt_program_sessions to authenticated;\ngrant update(status,completed_at,sequence_no) on public.pt_program_sessions to authenticated;

create table if not exists public.pt_checkins (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id) on delete cascade,
 created_by uuid not null references public.profiles(id),
 title text not null,
 questions jsonb not null default '[]'::jsonb,
 answers jsonb,
 status text not null default 'pending' check(status in ('pending','submitted','reviewed')),
 submitted_at timestamptz,
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists pt_checkins_member_created_idx on public.pt_checkins(member_id,created_at desc);
alter table public.pt_checkins enable row level security;
create policy pt_checkins_read_own_or_staff on public.pt_checkins for select to authenticated using(member_id=auth.uid() or public.is_admin_or_manager());
create policy pt_checkins_staff_insert on public.pt_checkins for insert to authenticated with check(public.is_admin_or_manager() and created_by=auth.uid());
create policy pt_checkins_member_answer on public.pt_checkins for update to authenticated using(member_id=auth.uid() and status='pending') with check(member_id=auth.uid() and status='submitted');
create policy pt_checkins_staff_update on public.pt_checkins for update to authenticated using(public.is_admin_or_manager()) with check(public.is_admin_or_manager());
revoke update on public.pt_checkins from authenticated;\ngrant select,insert on public.pt_checkins to authenticated;\ngrant update(answers,status,submitted_at) on public.pt_checkins to authenticated;
