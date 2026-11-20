
create or replace function public.get_class_attendance_counts(p_class_ids uuid[])
returns table(class_id uuid, confirmed_count integer)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst for å sjå gruppetimekapasitet.';
  end if;
  if p_class_ids is null or cardinality(p_class_ids) = 0 then return; end if;
  if cardinality(p_class_ids) > 100 then
    raise exception 'For mange gruppetimar i same førespurnad.';
  end if;
  return query
  select c.id, count(b.id)::integer
  from public.classes c
  left join public.class_bookings b
    on b.class_id = c.id and b.status in ('confirmed','pending')
  where c.id = any(p_class_ids)
    and (c.published = true or public.is_admin_or_manager())
  group by c.id;
end;
$function$;

create or replace function public.check_class_booking_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
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

  if new.status in ('confirmed', 'pending') and active_count >= max_capacity then
    raise exception 'Denne gruppetimen er full.';
  end if;

  if new.status = 'waitlist' and active_count < max_capacity then
    raise exception 'Det er framleis ledige plassar. Meld deg på vanleg måte.';
  end if;

  return new;
end;
$function$;

create or replace function public.book_class(p_class_id uuid)
returns table(booking_id uuid, booking_status text)
language plpgsql
security invoker
set search_path = public, pg_temp
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

  if not found or not coalesce(v_published,false) or v_cancelled_at is not null or v_starts_at <= now() then
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

  select counts.confirmed_count into v_active_count
  from public.get_class_attendance_counts(array[p_class_id]) counts
  where counts.class_id = p_class_id;

  if v_active_count is null then
    raise exception 'Kapasiteten for gruppetimen kunne ikkje kontrollerast.';
  end if;

  v_status := case when v_active_count < v_capacity then 'confirmed' else 'waitlist' end;

  insert into public.class_bookings(class_id, member_id, status)
  values (p_class_id, v_member_id, v_status)
  returning id into v_booking_id;

  return query select v_booking_id, v_status;
end;
$function$;

drop policy if exists class_bookings_insert_own on public.class_bookings;
create policy class_bookings_insert_own
on public.class_bookings
for insert
to authenticated
with check (
  member_id = (select auth.uid())
  and (select public.is_active_user())
  and status in ('confirmed','pending','waitlist')
  and exists (
    select 1 from public.classes c
    where c.id = class_bookings.class_id
      and c.published = true
      and c.cancelled_at is null
      and c.starts_at > now()
  )
);
