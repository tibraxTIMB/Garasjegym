-- One shared daily WOD for the whole membership.
create table if not exists public.daily_wod (
  id boolean primary key default true check (id = true),
  wod_id uuid not null references public.wods(id) on delete cascade,
  set_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.daily_wod enable row level security;
drop policy if exists daily_wod_read_active on public.daily_wod;
create policy daily_wod_read_active on public.daily_wod
  for select to authenticated
  using (is_active_user() or is_admin_or_manager());
drop policy if exists daily_wod_manage_staff on public.daily_wod;
create policy daily_wod_manage_staff on public.daily_wod
  for all to authenticated
  using (is_admin_or_manager())
  with check (is_admin_or_manager());
