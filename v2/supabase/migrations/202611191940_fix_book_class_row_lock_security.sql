-- book_class() must lock the class row while a member books.
-- A SECURITY INVOKER function cannot SELECT ... FOR UPDATE on classes because
-- members intentionally have no UPDATE policy on the classes table. Run this
-- narrow RPC as its owner, validate the authenticated member, lock the class,
-- count capacity, and insert only a booking for auth.uid().
create or replace function public.book_class(p_class_id uuid)
returns table(booking_id uuid, booking_status text)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_member_id uuid := auth.uid();
  v_capacity integer;
  v_starts_at timestamptz;
  v_published boolean;
  v_cancelled_at timestamptz;
  v_active_count integer;
  v_status text;
  v_booking_id uuid;
begin
  if v_member_id is null or not public.is_active_user() then
    raise exception 'Aktivt medlemskap krevst for å melda seg på.';
  end if;

  select c.capacity, c.starts_at, c.published, c.cancelled_at
    into v_capacity, v_starts_at, v_published, v_cancelled_at
  from public.classes c
  where c.id = p_class_id
  for update;

  if not found
    or not coalesce(v_published,false)
    or v_cancelled_at is not null
    or v_starts_at <= pg_catalog.now() then
    raise exception 'Påmelding er ikkje open for denne gruppetimen.';
  end if;

  if exists (
    select 1 from public.class_bookings b
    where b.class_id = p_class_id
      and b.member_id = v_member_id
      and b.status in ('confirmed','pending','waitlist')
  ) then
    raise exception 'Du er allereie påmeld eller står på venteliste.';
  end if;

  select count(*)::integer into v_active_count
  from public.class_bookings b
  where b.class_id = p_class_id
    and b.status in ('confirmed','pending');

  v_status := case when v_active_count < v_capacity then 'confirmed' else 'waitlist' end;

  insert into public.class_bookings(class_id,member_id,status)
  values (p_class_id,v_member_id,v_status)
  returning id into v_booking_id;

  return query select v_booking_id,v_status;
end;
$function$;

revoke all on function public.book_class(uuid) from public, anon;
grant execute on function public.book_class(uuid) to authenticated;

comment on function public.book_class(uuid) is
  'Atomic member group-class booking. Locks and validates class capacity while exposing only the caller’s own booking result.';
