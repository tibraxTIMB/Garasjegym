-- Fix PT waitlist promotion notifications, coffee ready duplicates and atomic PT session ordering.
-- Applied to the isolated GarasjeGym 2.0 TEST project only.

create or replace function public.pt_promote_waitlist_after_cancel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_capacity integer;
  v_next_booking uuid;
  v_member_id uuid;
begin
  if old.status = 'booked' and new.status = 'cancelled' then
    select capacity into v_capacity
    from public.pt_sessions
    where id = new.session_id
    for update;

    if (select count(*) from public.pt_bookings
        where session_id = new.session_id and status = 'booked') < coalesce(v_capacity,0) then
      select id, member_id into v_next_booking, v_member_id
      from public.pt_bookings
      where session_id = new.session_id and status = 'waitlist'
      order by created_at asc, id asc
      limit 1
      for update skip locked;

      if v_next_booking is not null then
        update public.pt_bookings
        set status = 'booked', updated_at = pg_catalog.now()
        where id = v_next_booking;

        insert into public.notifications
          (recipient_id,title,body,category,href,priority,requires_action,dedupe_key)
        values
          (v_member_id,'Du har fått plass på PT-timen',
           'Ein plass har blitt ledig. Du er no meldt på PT-timen.',
           'pt','pt-studio','high',false,
           'pt-waitlist-promoted:' || v_next_booking::text)
        on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
      end if;
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.notify_member_coffee_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare status_label text;
begin
  -- The dedicated ready trigger sends the single actionable pickup notification.
  if new.status is distinct from old.status and new.status <> 'ready' then
    status_label := case new.status
      when 'preparing' then 'I produksjon'
      when 'collected' then 'Henta'
      when 'cancelled' then 'Avbroten'
      else new.status end;
    insert into public.notifications(recipient_id,title,body,category,href,priority,requires_action)
    values(new.member_id,'Oppdatert kaffibestilling',
      'Bestillinga di er no: ' || status_label || '.',
      'coffee','kaffi','normal',false);
  end if;
  return new;
end;
$function$;

create or replace function public.reorder_pt_program_sessions(
  p_session_id uuid,
  p_target_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_program_id uuid;
  v_first public.pt_program_sessions%rowtype;
  v_second public.pt_program_sessions%rowtype;
begin
  if auth.uid() is null or not public.is_admin_or_manager() then
    raise exception 'Berre PT-administrator kan endra rekkjefølgja.';
  end if;
  if p_session_id is null or p_target_session_id is null or p_session_id = p_target_session_id then
    raise exception 'Ugyldig øktval for omorganisering.';
  end if;

  select program_id into v_program_id
  from public.pt_program_sessions
  where id = p_session_id
  for update;

  if v_program_id is null then
    raise exception 'PT-økta finst ikkje.';
  end if;

  perform 1 from public.pt_programs where id = v_program_id for update;

  select * into v_first
  from public.pt_program_sessions
  where id = p_session_id and program_id = v_program_id
  for update;

  select * into v_second
  from public.pt_program_sessions
  where id = p_target_session_id and program_id = v_program_id
  for update;

  if v_first.id is null or v_second.id is null then
    raise exception 'Øktene må høyra til same PT-program.';
  end if;

  update public.pt_program_sessions
  set sequence_no = -1
  where id = v_first.id;

  update public.pt_program_sessions
  set sequence_no = v_first.sequence_no,
      week_no = v_first.week_no,
      day_no = v_first.day_no
  where id = v_second.id;

  update public.pt_program_sessions
  set sequence_no = v_second.sequence_no,
      week_no = v_second.week_no,
      day_no = v_second.day_no
  where id = v_first.id;
end;
$function$;

revoke all on function public.reorder_pt_program_sessions(uuid,uuid) from public, anon;
grant execute on function public.reorder_pt_program_sessions(uuid,uuid) to authenticated;
