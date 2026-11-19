-- Restrict member-side PT updates to completion fields only.
-- Staff (admin/manager) retains the existing full update workflow.
-- Safe to re-run: functions are replaced and triggers are recreated.

create or replace function public.pt_guard_member_wod_assignment_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if public.is_admin_or_manager() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.member_id is distinct from old.member_id
    or new.wod_id is distinct from old.wod_id
    or new.assigned_by is distinct from old.assigned_by
    or new.linked_session_id is distinct from old.linked_session_id
    or new.due_date is distinct from old.due_date
    or new.location is distinct from old.location
    or new.coach_note is distinct from old.coach_note
    or new.created_at is distinct from old.created_at then
    raise exception 'Medlem kan berre oppdatera status og eiga gjennomføring på WOD-tildelinga.';
  end if;

  if old.status not in ('assigned', 'in_progress')
    or new.status not in ('in_progress', 'completed') then
    raise exception 'Ugyldig statusendring for WOD-tildeling.';
  end if;

  if new.workout_log_id is not null and not exists (
    select 1
    from public.workout_logs wl
    where wl.id = new.workout_log_id
      and wl.member_id = (select auth.uid())
  ) then
    raise exception 'WOD-tildelinga kan berre koplast til di eiga treningsøkt.';
  end if;

  if new.status = 'completed' then
    new.completed_at := coalesce(old.completed_at, now());
  else
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists pt_guard_member_wod_assignment_update on public.pt_wod_assignments;
create trigger pt_guard_member_wod_assignment_update
before update on public.pt_wod_assignments
for each row execute function public.pt_guard_member_wod_assignment_update();

create or replace function public.pt_guard_member_program_session_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if public.is_admin_or_manager() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.program_id is distinct from old.program_id
    or new.sequence_no is distinct from old.sequence_no
    or new.title is distinct from old.title
    or new.wod_id is distinct from old.wod_id
    or new.scheduled_date is distinct from old.scheduled_date
    or new.workout_snapshot is distinct from old.workout_snapshot
    or new.coach_note is distinct from old.coach_note
    or new.week_no is distinct from old.week_no
    or new.day_no is distinct from old.day_no
    or new.session_kind is distinct from old.session_kind
    or new.focus_area is distinct from old.focus_area
    or new.estimated_minutes is distinct from old.estimated_minutes
    or new.created_at is distinct from old.created_at then
    raise exception 'Medlem kan berre oppdatera status og eiga treningslogg på PT-økta.';
  end if;

  if old.status not in ('planned', 'in_progress')
    or new.status not in ('in_progress', 'completed') then
    raise exception 'Ugyldig statusendring for PT-økta.';
  end if;

  if new.workout_log_id is not null and not exists (
    select 1
    from public.workout_logs wl
    where wl.id = new.workout_log_id
      and wl.member_id = (select auth.uid())
  ) then
    raise exception 'PT-økta kan berre koplast til di eiga treningsøkt.';
  end if;

  if new.workout_log_id is distinct from old.workout_log_id
    and new.status <> 'completed' then
    raise exception 'Treningslogg kan berre koplast til ei fullført PT-økt.';
  end if;

  if new.status = 'completed' then
    new.completed_at := coalesce(old.completed_at, now());
  else
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists pt_guard_member_program_session_update on public.pt_program_sessions;
create trigger pt_guard_member_program_session_update
before update on public.pt_program_sessions
for each row execute function public.pt_guard_member_program_session_update();

-- These functions are trigger entry points, not client-callable RPCs.
revoke all on function public.pt_guard_member_wod_assignment_update() from public, anon, authenticated;
revoke all on function public.pt_guard_member_program_session_update() from public, anon, authenticated;
