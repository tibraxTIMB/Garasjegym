grant update(workout_log_id) on public.pt_program_sessions to authenticated;

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
   or new.coach_note is distinct from old.coach_note then
   raise exception 'Medlem kan berre oppdatera status og eiga treningslogg på PT-økta.';
  end if;
  if new.workout_log_id is distinct from old.workout_log_id and
    (new.status <> 'completed' or not exists (
      select 1 from public.workout_logs wl
      where wl.id=new.workout_log_id and wl.member_id=(select auth.uid())
    )) then
    raise exception 'PT-økta kan berre koplast til di eiga fullførte treningsøkt.';
  end if;
 end if;
 return new;
end;
$$;
