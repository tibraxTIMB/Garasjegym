-- Serialize capacity checks by locking the class row.
-- Prevents two concurrent bookings from both observing the last free place.
create or replace function public.check_class_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  max_capacity integer;
  active_count integer;
begin
  select capacity into max_capacity
  from public.classes
  where id = new.class_id
  for update;

  if max_capacity is null then
    raise exception 'Gruppetimen finst ikkje.';
  end if;

  select count(*) into active_count
  from public.class_bookings
  where class_id = new.class_id
    and status in ('confirmed', 'pending')
    and id is distinct from new.id;

  if new.status in ('confirmed', 'pending')
     and active_count >= max_capacity then
    raise exception 'Denne gruppetimen er full.';
  end if;

  return new;
end;
$$;
revoke execute on function public.check_class_booking_capacity() from public, anon, authenticated;
