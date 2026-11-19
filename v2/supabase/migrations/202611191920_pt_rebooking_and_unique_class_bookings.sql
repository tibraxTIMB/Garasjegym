-- Multiple active bookings are already prevented by the existing
-- class_bookings_one_active_per_member unique partial index.
-- Keep historical cancelled/declined rows intact and allow rebooking.

-- Members may only cancel their own PT booking through direct table access.
-- The SECURITY DEFINER book_pt_session() RPC is allowed to reactivate a previously
-- cancelled row when the member books the same future PT slot again.
create or replace function public.pt_guard_member_booking_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if pg_catalog.pg_trigger_depth() > 1 then
    return new;
  end if;

  if public.is_admin_or_manager() then
    return new;
  end if;

  -- book_pt_session() runs as its trusted owner (postgres); do not mistake
  -- that controlled RPC's cancelled -> booked transition for a client update.
  if current_user = 'postgres' then
    return new;
  end if;

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

  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;
