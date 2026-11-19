-- Ensure members use the capacity-checked booking RPC and can only cancel
-- their own PT bookings/requests or submit their own check-in answers.
-- Staff workflows remain unchanged.

create or replace function public.pt_guard_member_booking_update()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if public.is_admin_or_manager() then return new; end if;
  if new.id is distinct from old.id
    or new.session_id is distinct from old.session_id
    or new.member_id is distinct from old.member_id
    or new.note is distinct from old.note
    or new.created_at is distinct from old.created_at then
    raise exception 'Medlem kan berre avlysa eiga PT-bestilling.';
  end if;
  if old.status not in ('booked','waitlist') or new.status <> 'cancelled' then
    raise exception 'Medlem kan berre avlysa ei aktiv PT-bestilling.';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.pt_guard_member_checkin_update()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if public.is_admin_or_manager() then return new; end if;
  if new.id is distinct from old.id
    or new.member_id is distinct from old.member_id
    or new.created_by is distinct from old.created_by
    or new.title is distinct from old.title
    or new.questions is distinct from old.questions
    or new.reviewed_at is distinct from old.reviewed_at
    or new.created_at is distinct from old.created_at then
    raise exception 'Medlem kan berre senda inn eigne svar på statussjekken.';
  end if;
  if old.status <> 'pending' or new.status <> 'submitted' or new.answers is null then
    raise exception 'Statussvaret kan berre sendast inn éin gong.';
  end if;
  new.submitted_at := coalesce(old.submitted_at, now());
  return new;
end;
$function$;

create or replace function public.pt_guard_member_request_update()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if public.is_admin_or_manager() then return new; end if;
  if new.id is distinct from old.id
    or new.member_id is distinct from old.member_id
    or new.preferred_at is distinct from old.preferred_at
    or new.alternative_at is distinct from old.alternative_at
    or new.availability_note is distinct from old.availability_note
    or new.goal is distinct from old.goal
    or new.staff_note is distinct from old.staff_note
    or new.handled_by is distinct from old.handled_by
    or new.handled_at is distinct from old.handled_at
    or new.archived_at is distinct from old.archived_at
    or new.created_at is distinct from old.created_at then
    raise exception 'Medlem kan berre avlysa eiga PT-førespurnad.';
  end if;
  if old.status <> 'pending' or new.status <> 'cancelled' then
    raise exception 'Berre ventande PT-førespurnader kan avlysast.';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function public.pt_guard_member_service_request_update()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if public.is_admin_or_manager() then return new; end if;
  if new.id is distinct from old.id
    or new.member_id is distinct from old.member_id
    or new.service_id is distinct from old.service_id
    or new.service_title is distinct from old.service_title
    or new.member_note is distinct from old.member_note
    or new.preferred_at is distinct from old.preferred_at
    or new.assigned_coach_id is distinct from old.assigned_coach_id
    or new.handled_by is distinct from old.handled_by
    or new.handled_at is distinct from old.handled_at
    or new.created_at is distinct from old.created_at then
    raise exception 'Medlem kan berre avlysa eiga PT-bestilling.';
  end if;
  if old.status <> 'pending' or new.status <> 'cancelled' then
    raise exception 'Berre ventande PT-bestillingar kan avlysast.';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists pt_guard_member_booking_update on public.pt_bookings;
create trigger pt_guard_member_booking_update before update on public.pt_bookings
for each row execute function public.pt_guard_member_booking_update();

drop trigger if exists pt_guard_member_checkin_update on public.pt_checkins;
create trigger pt_guard_member_checkin_update before update on public.pt_checkins
for each row execute function public.pt_guard_member_checkin_update();

drop trigger if exists pt_guard_member_request_update on public.pt_requests;
create trigger pt_guard_member_request_update before update on public.pt_requests
for each row execute function public.pt_guard_member_request_update();

drop trigger if exists pt_guard_member_service_request_update on public.pt_service_requests;
create trigger pt_guard_member_service_request_update before update on public.pt_service_requests
for each row execute function public.pt_guard_member_service_request_update();

-- Direct INSERT bypasses the capacity-checked book_pt_session RPC.
drop policy if exists pt_bookings_insert on public.pt_bookings;
create policy pt_bookings_staff_insert on public.pt_bookings
for insert to authenticated
with check (public.is_active_user() and public.is_admin_or_manager());

-- Members cancel through a guarded status update so the waitlist trigger runs.
drop policy if exists pt_bookings_delete on public.pt_bookings;
create policy pt_bookings_staff_delete on public.pt_bookings
for delete to authenticated
using (public.is_active_user() and public.is_admin_or_manager());

revoke all on function public.pt_guard_member_booking_update() from public, anon, authenticated;
revoke all on function public.pt_guard_member_checkin_update() from public, anon, authenticated;
revoke all on function public.pt_guard_member_request_update() from public, anon, authenticated;
revoke all on function public.pt_guard_member_service_request_update() from public, anon, authenticated;
