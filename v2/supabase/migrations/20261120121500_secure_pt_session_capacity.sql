-- Preserve the PT capacity summary without exposing individual booking rows.
-- The public view uses caller privileges; the private helper returns aggregate-only data
-- after validating the authenticated member. Never expose the helper schema through PostgREST.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.pt_session_capacity_counts()
returns table (
  session_id uuid,
  booked_count integer,
  waitlist_count integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Aktivt medlemskap krevst for å sjå kapasitet på PT-timar.';
  end if;

  return query
  select
    s.id,
    count(b.id) filter (where b.status = 'booked')::integer,
    count(b.id) filter (where b.status = 'waitlist')::integer
  from public.pt_sessions s
  left join public.pt_bookings b on b.session_id = s.id
  where s.status = 'published'
  group by s.id;
end;
$function$;

revoke all on function private.pt_session_capacity_counts() from public, anon;
grant execute on function private.pt_session_capacity_counts() to authenticated, service_role;

create or replace view public.pt_session_capacity
with (security_invoker = true)
as
select session_id, booked_count, waitlist_count
from private.pt_session_capacity_counts();

revoke all on public.pt_session_capacity from public, anon;
grant select on public.pt_session_capacity to authenticated, service_role;

comment on view public.pt_session_capacity is
  'Aggregate-only PT capacity summary. SECURITY INVOKER view calls a private, auth-checked helper; individual booking rows remain protected by RLS.';
