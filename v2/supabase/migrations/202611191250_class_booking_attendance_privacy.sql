-- Members may read only their own class booking rows. Staff retains the
-- attendee roster. Non-staff receives aggregate counts through a restricted RPC.

drop policy if exists class_bookings_read_own_or_staff on public.class_bookings;

create policy class_bookings_read_own_or_staff
on public.class_bookings
for select
to authenticated
using (
  (select public.is_active_user())
  and (
    member_id = (select auth.uid())
    or (select public.is_admin_or_manager())
  )
);

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

  if p_class_ids is null or cardinality(p_class_ids) = 0 then
    return;
  end if;

  if cardinality(p_class_ids) > 100 then
    raise exception 'For mange gruppetimar i same førespurnad.';
  end if;

  return query
  select c.id, count(b.id)::integer
  from public.classes c
  left join public.class_bookings b
    on b.class_id = c.id
   and b.status = 'confirmed'
  where c.id = any(p_class_ids)
    and (c.published = true or public.is_admin_or_manager())
  group by c.id;
end;
$function$;

revoke all on function public.get_class_attendance_counts(uuid[]) from public, anon;
grant execute on function public.get_class_attendance_counts(uuid[]) to authenticated;
