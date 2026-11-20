create table if not exists public.member_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  super_simple_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_preferences enable row level security;
drop policy if exists member_preferences_read_own on public.member_preferences;
create policy member_preferences_read_own
  on public.member_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists member_preferences_insert_own on public.member_preferences;
create policy member_preferences_insert_own
  on public.member_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists member_preferences_update_own on public.member_preferences;
create policy member_preferences_update_own
  on public.member_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update on public.member_preferences to authenticated;
revoke all on public.member_preferences from anon;