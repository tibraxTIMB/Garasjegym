alter table public.classes
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_note text;

create index if not exists classes_cancelled_at_idx on public.classes(cancelled_at);
create index if not exists classes_cancelled_by_idx on public.classes(cancelled_by);

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

  if not found or not coalesce(v_published,false) or v_cancelled_at is not null or v_starts_at <= pg_catalog.now() then
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

create or replace function public.promote_class_waitlist_after_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_capacity integer;
  v_cancelled_at timestamptz;
  v_confirmed integer;
  v_next_booking uuid;
  v_member_id uuid;
begin
  if old.status in ('confirmed','pending') and new.status = 'cancelled' then
    select c.capacity, c.cancelled_at into v_capacity, v_cancelled_at
    from public.classes c
    where c.id = new.class_id
    for update;

    if v_cancelled_at is null then
      select count(*)::integer into v_confirmed
      from public.class_bookings b
      where b.class_id = new.class_id
        and b.status in ('confirmed','pending');

      if v_capacity is not null and v_confirmed < v_capacity then
        select b.id,b.member_id into v_next_booking,v_member_id
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

          insert into public.notifications(recipient_id,title,body,category,href,priority)
          values (v_member_id,'Du har fått plass på gruppetimen','Ein plass har blitt ledig. Du er no meldt på.','booking','/timeplan','high');
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$function$;

create or replace function public.cancel_class(p_class_id uuid, p_note text default null)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_cancelled integer := 0;
begin
  if auth.uid() is null or not public.is_admin_or_manager() then
    raise exception 'Du har ikkje tilgang til å avlysa gruppetimar.';
  end if;

  perform 1 from public.classes where id = p_class_id for update;
  if not found then raise exception 'Gruppetimen finst ikkje.'; end if;

  if exists (select 1 from public.classes where id=p_class_id and cancelled_at is not null) then
    return 0;
  end if;

  update public.classes
  set cancelled_at=now(),cancelled_by=auth.uid(),cancellation_note=nullif(btrim(p_note),'')
  where id=p_class_id;

  with cancelled_bookings as (
    update public.class_bookings
    set status='cancelled',updated_at=now()
    where class_id=p_class_id and status in ('confirmed','pending','waitlist')
    returning member_id
  )
  insert into public.notifications(recipient_id,title,body,category,href,priority)
  select member_id,'Gruppetimen er avlyst',
    coalesce(nullif(btrim(p_note),''),'Instruktøren har avlyst gruppetimen.'),
    'booking','/timeplan','high'
  from cancelled_bookings;

  get diagnostics v_cancelled = row_count;
  return v_cancelled;
end;
$function$;

revoke all on function public.cancel_class(uuid,text) from public, anon;
grant execute on function public.cancel_class(uuid,text) to authenticated;
