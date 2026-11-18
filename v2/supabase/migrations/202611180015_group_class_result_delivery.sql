-- GarasjeGym 2.0: publish group-class WODs and track member completion.
-- Development/test branch only. Apply to the isolated garasjegym-2-test project.
alter table public.wods
  add column if not exists category text not null default 'main';

alter table public.wods
  drop constraint if exists wods_category_check;

alter table public.wods
  add constraint wods_category_check
  check (category in ('warmup','main'));

comment on column public.wods.category is
  'Group-class result handling: warmup is acknowledged without a score; main requires a workout result.';

alter table public.class_live_sessions
  add column if not exists results_published_at timestamptz;

create table if not exists public.class_session_wod_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_live_sessions(id) on delete cascade,
  wod_id uuid not null references public.wods(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (session_id, wod_id, member_id)
);

create index if not exists class_session_wod_completions_member_idx
  on public.class_session_wod_completions(member_id, completed_at desc);

alter table public.class_session_wod_completions enable row level security;

drop policy if exists class_session_wod_completions_read_own_or_staff
  on public.class_session_wod_completions;
create policy class_session_wod_completions_read_own_or_staff
on public.class_session_wod_completions for select to authenticated
using (
  public.is_active_user()
  and (
    member_id = (select auth.uid())
    or public.is_admin_or_manager()
  )
);

drop policy if exists class_session_wod_completions_insert_own
  on public.class_session_wod_completions;
create policy class_session_wod_completions_insert_own
on public.class_session_wod_completions for insert to authenticated
with check (
  public.is_active_user()
  and member_id = (select auth.uid())
  and exists (
    select 1
    from public.class_live_sessions s
    join public.class_bookings b on b.class_id = s.class_id
    where s.id = class_session_wod_completions.session_id
      and s.status = 'finished'
      and s.results_published_at is not null
      and b.member_id = (select auth.uid())
      and b.status = 'confirmed'
      and (s.wod_ids @> jsonb_build_array(class_session_wod_completions.wod_id::text) or s.wod_id = class_session_wod_completions.wod_id)
  )
);

grant select, insert on public.class_session_wod_completions to authenticated;
revoke all on public.class_session_wod_completions from anon;

create or replace function public.publish_class_session_results(p_session_id uuid)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.class_live_sessions%rowtype;
  v_count integer := 0;
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre instruktør kan publisera gruppetime-WOD-ar.';
  end if;

  select * into v_session
  from public.class_live_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Gruppetreninga finst ikkje.';
  end if;
  if v_session.status <> 'finished' then
    raise exception 'Gruppetreninga må avsluttast før WOD-ane kan publiserast.';
  end if;
  if v_session.results_published_at is not null then
    return 0;
  end if;

  insert into public.notifications(recipient_id,title,body,category,href)
  select b.member_id,
         'Resultat frå gruppetimen er klart',
         v_session.session_title || ' – registrer resultatet frå WOD-ane i Mi trening.',
         'booking',
         'mi-trening'
  from public.class_bookings b
  where b.class_id = v_session.class_id
    and b.status = 'confirmed';

  get diagnostics v_count = row_count;

  update public.class_live_sessions
  set results_published_at = now()
  where id = p_session_id;

  return v_count;
end;
$$;

revoke all on function public.publish_class_session_results(uuid) from public, anon;
grant execute on function public.publish_class_session_results(uuid) to authenticated;
