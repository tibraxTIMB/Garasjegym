
drop policy if exists class_bookings_update_own_or_admin on public.class_bookings;
create policy class_bookings_update_own_or_admin
on public.class_bookings
for update
to authenticated
using (
  (
    member_id = (select auth.uid())
    and (select public.is_active_user())
    and status in ('confirmed','pending','waitlist')
    and exists (
      select 1 from public.classes c
      where c.id = class_bookings.class_id
        and c.starts_at > now()
        and c.cancelled_at is null
        and c.published = true
    )
  )
  or (select public.is_admin_or_manager())
)
with check (
  (
    member_id = (select auth.uid())
    and (select public.is_active_user())
    and status = 'cancelled'
    and attendance_status is null
    and attendance_marked_by is null
    and exists (
      select 1 from public.classes c
      where c.id = class_bookings.class_id
        and c.starts_at > now()
        and c.cancelled_at is null
        and c.published = true
    )
  )
  or (select public.is_admin_or_manager())
);

create or replace function public.cancel_class(p_class_id uuid, p_note text default null)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_cancelled integer := 0;
  v_starts_at timestamptz;
begin
  if auth.uid() is null or not public.is_admin_or_manager() then
    raise exception 'Du har ikkje tilgang til å avlysa gruppetimar.';
  end if;

  select starts_at into v_starts_at
  from public.classes
  where id = p_class_id
  for update;

  if not found then raise exception 'Gruppetimen finst ikkje.'; end if;

  if exists (select 1 from public.classes where id=p_class_id and cancelled_at is not null) then
    return 0;
  end if;

  if v_starts_at <= now() then
    raise exception 'Starttidspunktet er passert. Registrer oppmøte og resultat i staden for å avlysa.';
  end if;

  if exists (
    select 1 from public.class_live_sessions
    where class_id=p_class_id
  ) then
    raise exception 'Gruppetimen har ei registrert fellesøkt. Avslutt og bevar treningshistorikken i staden for å avlysa.';
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
