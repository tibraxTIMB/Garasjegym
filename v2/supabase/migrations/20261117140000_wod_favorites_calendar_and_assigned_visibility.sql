-- GarasjeGym 2.0: controlled WOD visibility, per-member favorites, admin calendar
create table if not exists public.wod_favorites (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 wod_id uuid not null references public.wods(id) on delete cascade,
 created_at timestamptz not null default now(),
 constraint wod_favorites_user_wod_unique unique(user_id,wod_id)
);
alter table public.wod_favorites enable row level security;
grant select,insert,delete on public.wod_favorites to authenticated;
drop policy if exists wod_favorites_read_own on public.wod_favorites;
create policy wod_favorites_read_own on public.wod_favorites for select to authenticated using(user_id=(select auth.uid()) or public.is_admin_or_manager());
drop policy if exists wod_favorites_insert_own on public.wod_favorites;
create policy wod_favorites_insert_own on public.wod_favorites for insert to authenticated with check (
 user_id=(select auth.uid()) and public.is_active_user() and exists(select 1 from public.wods w where w.id=wod_id and (
 w.is_published=true or public.is_admin_or_manager() or exists(select 1 from public.pt_sessions ps where ps.client_id=(select auth.uid()) and ps.status in ('planned','published','completed') and w.id=any(coalesce(ps.wod_ids,'{}'::uuid[])))
 )));
drop policy if exists wod_favorites_delete_own on public.wod_favorites;
create policy wod_favorites_delete_own on public.wod_favorites for delete to authenticated using(user_id=(select auth.uid()) or public.is_admin_or_manager());
drop policy if exists wods_read_assigned on public.wods;
create policy wods_read_assigned on public.wods for select to authenticated using(public.is_active_user() and exists(select 1 from public.pt_sessions ps where ps.client_id=(select auth.uid()) and ps.status in ('planned','published','completed') and id=any(coalesce(ps.wod_ids,'{}'::uuid[]))));
create table if not exists public.calendar_events (
 id uuid primary key default gen_random_uuid(), title text not null,
 event_type text not null default 'other' check(event_type in ('other','pt','class','meeting','maintenance')),
 starts_at timestamptz not null, ends_at timestamptz not null, all_day boolean not null default false,
 description text not null default '', client_id uuid references public.profiles(id) on delete set null,
 pt_session_id uuid references public.pt_sessions(id) on delete set null,
 class_id uuid references public.classes(id) on delete set null,
 created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint calendar_events_valid_range check(ends_at>starts_at)
);
create index if not exists calendar_events_starts_at_idx on public.calendar_events(starts_at);
create index if not exists calendar_events_client_id_idx on public.calendar_events(client_id);
alter table public.calendar_events enable row level security;
grant select,insert,update,delete on public.calendar_events to authenticated;
drop policy if exists calendar_events_staff_all on public.calendar_events;
create policy calendar_events_staff_all on public.calendar_events for all to authenticated using(public.is_active_user() and public.is_admin_or_manager()) with check(public.is_active_user() and public.is_admin_or_manager() and created_by=(select auth.uid()));
