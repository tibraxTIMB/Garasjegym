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


-- Reject duplicate active bookings for the same member and class.
-- The preflight stops safely instead of deleting or merging existing user data.
do $
begin
  if exists (
    select 1
    from public.class_bookings
    where status in ('confirmed', 'pending')
    group by class_id, member_id
    having count(*) > 1
  ) then
    raise exception 'Duplikate i aktive gruppetimepåmeldingar må ryddast før kapasitetsmigreringa kan køyrast.';
  end if;
end;
$;

create unique index if not exists class_bookings_one_active_per_member
  on public.class_bookings(class_id, member_id)
  where status in ('confirmed', 'pending');

-- Attach the guard to the booking table. Defining the function alone does not
-- enforce capacity; this trigger serializes concurrent inserts/updates by class.
drop trigger if exists class_bookings_capacity_guard on public.class_bookings;
create trigger class_bookings_capacity_guard
before insert or update of class_id, status
on public.class_bookings
for each row
execute function public.check_class_booking_capacity();
