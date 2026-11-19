-- Waitlist promotion is a nested UPDATE performed by the trusted
-- SECURITY DEFINER AFTER-trigger pt_promote_waitlist_after_cancel().
-- Allow that nested trigger operation while keeping direct member updates
-- restricted to cancelling their own booking.

create or replace function public.pt_guard_member_booking_update()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

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

revoke all on function public.pt_guard_member_booking_update() from public, anon, authenticated;
