-- Remove internal record identifiers from the public-facing infotainment response.
create or replace function public.get_infotainment_schedule(p_from timestamptz, p_to timestamptz)
returns table(event_key text, category text, title text, starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Aktiv innlogging er kravd for garasjeskjermen.';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '31 days' then
    raise exception 'Ugyldig tidsperiode.';
  end if;
  return query
  with events as (
    select 'class'::text as category, c.title, c.starts_at,
      c.starts_at + make_interval(mins => greatest(1,c.duration_minutes)) as ends_at
    from public.classes c
    where c.published = true and c.cancelled_at is null
      and c.starts_at >= p_from and c.starts_at < p_to
    union all
    select 'pt'::text as category, 'PT-time'::text as title, s.starts_at,
      s.starts_at + make_interval(mins => greatest(1,s.duration_minutes)) as ends_at
    from public.pt_sessions s
    where s.client_id is not null and s.status in ('planned','published')
      and s.starts_at >= p_from and s.starts_at < p_to
  )
  select 'event-' || row_number() over(order by e.starts_at,e.category)::text,
    e.category,e.title,e.starts_at,e.ends_at
  from events e
  order by e.starts_at,e.category;
end;
$function$;
revoke all on function public.get_infotainment_schedule(timestamptz,timestamptz) from public, anon;
grant execute on function public.get_infotainment_schedule(timestamptz,timestamptz) to authenticated;