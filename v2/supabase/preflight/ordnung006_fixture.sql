-- Disposable PostgreSQL fixture; never run on an existing project.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema app_private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.profiles(id uuid primary key,role text,active boolean);
insert into public.profiles values
 ('00000000-0000-0000-0000-000000000001','admin',true),
 ('00000000-0000-0000-0000-000000000002','member',true),
 ('00000000-0000-0000-0000-000000000003','member',false),
 ('00000000-0000-0000-0000-000000000004','member',true);
create function public.is_active_user() returns boolean language sql stable security definer set search_path=pg_catalog,public as $$select coalesce((select active from public.profiles where id=auth.uid()),false)$$;
create function public.is_admin_or_manager() returns boolean language sql stable security definer set search_path=pg_catalog,public as $$select coalesce((select role in ('admin','manager') from public.profiles where id=auth.uid()),false)$$;
create function app_private.is_pt_coach_for_member(uuid) returns boolean language sql stable as $$select false$$;
grant usage on schema auth to authenticated;
create table public.workout_logs(id uuid primary key,member_id uuid,source_wod_id uuid,workout_date date,title text,format text,score_rounds integer,score_reps integer,score_time_seconds numeric,score_load_kg numeric,score_calories numeric,score_distance numeric,score_unit text,result_data jsonb);
create table public.pt_wod_assignments(id uuid primary key,member_id uuid,wod_id uuid,workout_log_id uuid,status text);
create table public.pt_programs(id uuid primary key,client_id uuid);
create table public.pt_program_sessions(id uuid primary key,program_id uuid,wod_id uuid,workout_log_id uuid,status text);
insert into public.workout_logs(id,member_id,source_wod_id,workout_date,title,format,result_data) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','2026-11-25','Individual','AMRAP','{"wod_engine":{"participation":"individual"},"exercise_results":[]}'),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','2026-11-25','Team','AMRAP','{"samspel":{"team_score":true},"exercise_results":[]}'),
('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003','2026-11-25','Older','AMRAP','{"exercise_results":[]}');
insert into public.pt_wod_assignments values
('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','completed'),
('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','completed'),
('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000003','completed');

alter table public.pt_wod_assignments add column linked_session_id uuid,add column due_date date,add column updated_at timestamptz default now();
-- Fixture-only row access: actual production policies were inspected separately.
alter table public.pt_wod_assignments enable row level security;
grant select,update on public.pt_wod_assignments to authenticated;
create policy fixture_assignment_access on public.pt_wod_assignments for select to authenticated using (public.is_active_user() and (member_id=auth.uid() or public.is_admin_or_manager()));
create policy fixture_assignment_update on public.pt_wod_assignments for update to authenticated using (public.is_active_user() and (member_id=auth.uid() or public.is_admin_or_manager())) with check (public.is_active_user() and (member_id=auth.uid() or public.is_admin_or_manager()));
insert into public.pt_wod_assignments(id,member_id,wod_id,status) values ('30000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000004','assigned');
