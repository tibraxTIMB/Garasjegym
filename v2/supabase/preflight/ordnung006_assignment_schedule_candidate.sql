-- Candidate only. Extends existing assignment rows; no parallel scheduling table.
begin;
alter table public.pt_wod_assignments
 add column scheduled_date date,
 add column scheduled_time time without time zone,
 add constraint pt_wod_assignment_schedule_time_requires_date check (scheduled_time is null or scheduled_date is not null),
 add constraint pt_wod_assignment_schedule_not_booking check (linked_session_id is null or (scheduled_date is null and scheduled_time is null));
create or replace function app_private.guard_pt_assignment_schedule()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
begin
 if new.scheduled_date is not distinct from old.scheduled_date and new.scheduled_time is not distinct from old.scheduled_time then return new; end if;
 if (select public.is_active_user()) is distinct from true or (select public.is_admin_or_manager()) is distinct from true then
  raise exception 'Berre aktivt driftspersonell kan flytta ei enkeltståande WOD-tildeling.' using errcode='42501';
 end if;
 if old.status <> 'assigned' or new.status <> 'assigned' or old.workout_log_id is not null or new.workout_log_id is not null or old.linked_session_id is not null or new.linked_session_id is not null then
  raise exception 'Berre ikkje påbegynte, enkeltståande tildelingar kan flyttast.' using errcode='22023';
 end if;
 return new;
end;
$$;
revoke all on function app_private.guard_pt_assignment_schedule() from public,anon,authenticated;
create trigger pt_assignment_schedule_guard before update of scheduled_date,scheduled_time on public.pt_wod_assignments for each row execute function app_private.guard_pt_assignment_schedule();
commit;
