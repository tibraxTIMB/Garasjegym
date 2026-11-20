-- PT Studio 2.0 follow-up: optimize policies and protect coach-controlled plan fields.
drop policy if exists pt_intakes_read_own_or_staff on public.pt_intakes;
create policy pt_intakes_read_own_or_staff on public.pt_intakes for select to authenticated using(member_id=(select auth.uid()) or (select public.is_admin_or_manager()));
drop policy if exists pt_intakes_insert_own on public.pt_intakes;
create policy pt_intakes_insert_own on public.pt_intakes for insert to authenticated with check(member_id=(select auth.uid()) and status='new' and reviewed_by is null and reviewed_at is null);
drop policy if exists pt_intakes_staff_update on public.pt_intakes;
create policy pt_intakes_staff_update on public.pt_intakes for update to authenticated using((select public.is_admin_or_manager())) with check((select public.is_admin_or_manager()));

drop policy if exists pt_client_goals_read on public.pt_client_goals;
create policy pt_client_goals_read on public.pt_client_goals for select to authenticated using((member_id=(select auth.uid()) and is_visible) or (select public.is_admin_or_manager()));
drop policy if exists pt_client_goals_staff_insert on public.pt_client_goals;
create policy pt_client_goals_staff_insert on public.pt_client_goals for insert to authenticated with check((select public.is_admin_or_manager()) and created_by=(select auth.uid()));
drop policy if exists pt_client_goals_staff_update on public.pt_client_goals;
create policy pt_client_goals_staff_update on public.pt_client_goals for update to authenticated using((select public.is_admin_or_manager())) with check((select public.is_admin_or_manager()));
drop policy if exists pt_client_goals_staff_delete on public.pt_client_goals;
create policy pt_client_goals_staff_delete on public.pt_client_goals for delete to authenticated using((select public.is_admin_or_manager()));

drop policy if exists pt_program_templates_read_active on public.pt_program_templates;
create policy pt_program_templates_read_active on public.pt_program_templates for select to authenticated using(is_active or (select public.is_admin_or_manager()));
drop policy if exists pt_program_templates_staff_insert on public.pt_program_templates;
create policy pt_program_templates_staff_insert on public.pt_program_templates for insert to authenticated with check((select public.is_admin_or_manager()) and created_by=(select auth.uid()));
drop policy if exists pt_program_templates_staff_update on public.pt_program_templates;
create policy pt_program_templates_staff_update on public.pt_program_templates for update to authenticated using((select public.is_admin_or_manager())) with check((select public.is_admin_or_manager()));

drop policy if exists pt_programs_read_own_or_staff on public.pt_programs;
create policy pt_programs_read_own_or_staff on public.pt_programs for select to authenticated using(client_id=(select auth.uid()) or (select public.is_admin_or_manager()));
drop policy if exists pt_programs_staff_insert on public.pt_programs;
create policy pt_programs_staff_insert on public.pt_programs for insert to authenticated with check((select public.is_admin_or_manager()) and created_by=(select auth.uid()));
drop policy if exists pt_programs_staff_update on public.pt_programs;
create policy pt_programs_staff_update on public.pt_programs for update to authenticated using((select public.is_admin_or_manager())) with check((select public.is_admin_or_manager()));

drop policy if exists pt_program_sessions_read_parent on public.pt_program_sessions;
create policy pt_program_sessions_read_parent on public.pt_program_sessions for select to authenticated using(exists(select 1 from public.pt_programs p where p.id=program_id and (p.client_id=(select auth.uid()) or (select public.is_admin_or_manager()))));
drop policy if exists pt_program_sessions_staff_insert on public.pt_program_sessions;
create policy pt_program_sessions_staff_insert on public.pt_program_sessions for insert to authenticated with check((select public.is_admin_or_manager()));
drop policy if exists pt_program_sessions_staff_update on public.pt_program_sessions;
drop policy if exists pt_program_sessions_member_complete on public.pt_program_sessions;
create policy pt_program_sessions_update_member_or_staff on public.pt_program_sessions for update to authenticated
using((select public.is_admin_or_manager()) or (status in ('planned','in_progress') and exists(select 1 from public.pt_programs p where p.id=program_id and p.client_id=(select auth.uid()))))
with check((select public.is_admin_or_manager()) or (status in ('completed','in_progress') and exists(select 1 from public.pt_programs p where p.id=program_id and p.client_id=(select auth.uid()))));

create or replace function public.pt_guard_member_program_session_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
 if not public.is_admin_or_manager() then
  if new.program_id is distinct from old.program_id
   or new.sequence_no is distinct from old.sequence_no
   or new.title is distinct from old.title
   or new.wod_id is distinct from old.wod_id
   or new.scheduled_date is distinct from old.scheduled_date
   or new.workout_snapshot is distinct from old.workout_snapshot
   or new.coach_note is distinct from old.coach_note
   or new.workout_log_id is distinct from old.workout_log_id then
   raise exception 'Medlem kan berre oppdatera status på eiga PT-økt.';
  end if;
 end if;
 return new;
end;
$$;
drop trigger if exists pt_guard_member_program_session_update on public.pt_program_sessions;
create trigger pt_guard_member_program_session_update before update on public.pt_program_sessions for each row execute function public.pt_guard_member_program_session_update();

drop policy if exists pt_checkins_read_own_or_staff on public.pt_checkins;
create policy pt_checkins_read_own_or_staff on public.pt_checkins for select to authenticated using(member_id=(select auth.uid()) or (select public.is_admin_or_manager()));
drop policy if exists pt_checkins_staff_insert on public.pt_checkins;
create policy pt_checkins_staff_insert on public.pt_checkins for insert to authenticated with check((select public.is_admin_or_manager()) and created_by=(select auth.uid()));
drop policy if exists pt_checkins_member_answer on public.pt_checkins;
drop policy if exists pt_checkins_staff_update on public.pt_checkins;
create policy pt_checkins_update_member_or_staff on public.pt_checkins for update to authenticated
using((select public.is_admin_or_manager()) or (member_id=(select auth.uid()) and status='pending'))
with check((select public.is_admin_or_manager()) or (member_id=(select auth.uid()) and status='submitted'));

create index if not exists pt_intakes_reviewed_by_idx on public.pt_intakes(reviewed_by);
create index if not exists pt_client_goals_created_by_idx on public.pt_client_goals(created_by);
create index if not exists pt_program_templates_created_by_idx on public.pt_program_templates(created_by);
create index if not exists pt_programs_template_id_idx on public.pt_programs(template_id);
create index if not exists pt_programs_created_by_idx on public.pt_programs(created_by);
create index if not exists pt_program_sessions_wod_id_idx on public.pt_program_sessions(wod_id);
create index if not exists pt_program_sessions_workout_log_id_idx on public.pt_program_sessions(workout_log_id);
create index if not exists pt_checkins_created_by_idx on public.pt_checkins(created_by);
