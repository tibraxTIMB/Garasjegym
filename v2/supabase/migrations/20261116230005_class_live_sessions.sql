-- GarasjeGym 2.0: synchronized group-training session state.
-- Staged for review; do not apply to production until the 2.0 migration pack is approved.
create table if not exists public.class_live_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  started_by uuid not null references public.profiles(id),
  status text not null default 'active' check (status in ('active','paused','finished')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  session_title text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists class_live_sessions_one_active_per_class
  on public.class_live_sessions(class_id) where status in ('active','paused');
create index if not exists class_live_sessions_status_started_idx
  on public.class_live_sessions(status, started_at desc);
alter table public.class_live_sessions enable row level security;
drop policy if exists class_live_sessions_read_attendees_or_staff on public.class_live_sessions;
create policy class_live_sessions_read_attendees_or_staff
on public.class_live_sessions for select to authenticated
using (
  public.is_active_user() and (
    public.is_admin_or_manager()
    or exists (
      select 1 from public.class_bookings b
      where b.class_id = class_live_sessions.class_id
        and b.member_id = (select auth.uid())
        and b.status = 'confirmed'
    )
  )
);
drop policy if exists class_live_sessions_insert_staff on public.class_live_sessions;
create policy class_live_sessions_insert_staff
on public.class_live_sessions for insert to authenticated
with check (
  public.is_active_user()
  and public.is_admin_or_manager()
  and started_by = (select auth.uid())
  and status = 'active'
);
drop policy if exists class_live_sessions_update_staff on public.class_live_sessions;
create policy class_live_sessions_update_staff
on public.class_live_sessions for update to authenticated
using (public.is_active_user() and public.is_admin_or_manager())
with check (
  public.is_active_user() and public.is_admin_or_manager()
  and status in ('active','paused','finished')
);
grant select, insert, update on public.class_live_sessions to authenticated;
revoke all on public.class_live_sessions from anon;
