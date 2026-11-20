
-- Group-class waitlist and attendance support. Additive; preserve all existing bookings.
alter table public.class_bookings
  drop constraint if exists class_bookings_status_check;
alter table public.class_bookings
  add constraint class_bookings_status_check
  check (status = any (array['confirmed','pending','waitlist','cancelled','declined']::text[]));

drop index if exists public.class_bookings_one_active_per_member;
create unique index class_bookings_one_active_per_member
  on public.class_bookings(class_id, member_id)
  where status in ('confirmed','pending','waitlist');

alter table public.class_bookings
  add column if not exists attendance_status text,
  add column if not exists attendance_marked_at timestamptz,
  add column if not exists attendance_marked_by uuid references public.profiles(id) on delete set null;

alter table public.class_bookings
  drop constraint if exists class_bookings_attendance_status_check;
alter table public.class_bookings
  add constraint class_bookings_attendance_status_check
  check (attendance_status is null or attendance_status in ('present','absent','excused'));

create index if not exists class_bookings_class_status_queue_idx
  on public.class_bookings(class_id, status, created_at, id);
create index if not exists classes_instructor_id_idx
  on public.classes(instructor_id);
create index if not exists class_session_wod_completions_wod_id_idx
  on public.class_session_wod_completions(wod_id);

create or replace function public.book_class(p_class_id uuid)
returns table(booking_id uuid, booking_status text)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_member_id uuid := auth.uid();
  v_capacity integer;
  v_starts_at timestamptz;
  v_published boolean;
  v_active_count integer;
  v_status text;
  v_booking_id uuid;
begin
  if v_member_id is null or not public.is_active_user() then
    raise exception 'Aktivt medlemskap krevst for å melda seg på.';
  end if;

  select c.capacity, c.starts_at, c.published
    into v_capacity, v_starts_at, v_published
  from public.classes c
  where c.id = p_class_id
  for update;

  if not found or not coalesce(v_published,false) or v_starts_at <= pg_catalog.now() then
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

  insert into public.class_bookings(class_id, member_id, status)
  values (p_class_id, v_member_id, v_status)
  returning id into v_booking_id;

  return query select v_booking_id, v_status;
end;
$function$;

revoke all on function public.book_class(uuid) from public, anon;
grant execute on function public.book_class(uuid) to authenticated;

create or replace function public.promote_class_waitlist_after_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_capacity integer;
  v_confirmed integer;
  v_next_booking uuid;
begin
  if old.status in ('confirmed','pending') and new.status = 'cancelled' then
    select c.capacity into v_capacity
    from public.classes c
    where c.id = new.class_id
    for update;

    select count(*)::integer into v_confirmed
    from public.class_bookings b
    where b.class_id = new.class_id
      and b.status in ('confirmed','pending');

    if v_capacity is not null and v_confirmed < v_capacity then
      select b.id into v_next_booking
      from public.class_bookings b
      where b.class_id = new.class_id
        and b.status = 'waitlist'
      order by b.created_at asc, b.id asc
      limit 1
      for update skip locked;

      if v_next_booking is not null then
        update public.class_bookings
        set status = 'confirmed', updated_at = pg_catalog.now()
        where id = v_next_booking;
      end if;
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.promote_class_waitlist_after_cancel() from public, anon, authenticated;
drop trigger if exists class_booking_promote_waitlist on public.class_bookings;
create trigger class_booking_promote_waitlist
after update of status on public.class_bookings
for each row
execute function public.promote_class_waitlist_after_cancel();
