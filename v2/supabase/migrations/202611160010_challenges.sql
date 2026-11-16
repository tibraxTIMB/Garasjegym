-- GarasjeGym 2.0: member challenges and individual progress.
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 2 and 100),
  description text not null default '',
  metric text not null check (metric in ('workouts','reps','kg','km','minutes')),
  goal numeric(12,2) not null check (goal > 0),
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenges_date_range_check check (ends_on >= starts_on)
);

create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  progress numeric(12,2) not null default 0 check (progress >= 0),
  note text not null default '',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenge_participants_unique unique (challenge_id, member_id)
);

create index if not exists challenges_active_dates_idx
  on public.challenges(is_active, starts_on, ends_on);
create index if not exists challenge_participants_member_idx
  on public.challenge_participants(member_id, challenge_id);

alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

drop policy if exists challenges_read_active on public.challenges;
create policy challenges_read_active on public.challenges
for select to authenticated
using (public.is_active_user() and (is_active or public.is_admin_or_manager()));

drop policy if exists challenges_staff_insert on public.challenges;
create policy challenges_staff_insert on public.challenges
for insert to authenticated
with check (public.is_active_user() and public.is_admin_or_manager() and created_by = (select auth.uid()));

drop policy if exists challenges_staff_update on public.challenges;
create policy challenges_staff_update on public.challenges
for update to authenticated
using (public.is_active_user() and public.is_admin_or_manager())
with check (public.is_active_user() and public.is_admin_or_manager());

drop policy if exists challenges_staff_delete on public.challenges;
create policy challenges_staff_delete on public.challenges
for delete to authenticated
using (public.is_active_user() and public.is_admin_or_manager());

drop policy if exists challenge_participants_read_own_or_staff on public.challenge_participants;
create policy challenge_participants_read_own_or_staff on public.challenge_participants
for select to authenticated
using (public.is_active_user() and (member_id = (select auth.uid()) or public.is_admin_or_manager()));

drop policy if exists challenge_participants_join_own on public.challenge_participants;
create policy challenge_participants_join_own on public.challenge_participants
for insert to authenticated
with check (
  public.is_active_user()
  and member_id = (select auth.uid())
  and exists (
    select 1 from public.challenges c
    where c.id = challenge_id and c.is_active and c.ends_on >= current_date
  )
);

drop policy if exists challenge_participants_update_own_or_staff on public.challenge_participants;
create policy challenge_participants_update_own_or_staff on public.challenge_participants
for update to authenticated
using (public.is_active_user() and (member_id = (select auth.uid()) or public.is_admin_or_manager()))
with check (
  public.is_active_user()
  and (member_id = (select auth.uid()) or public.is_admin_or_manager())
);

drop policy if exists challenge_participants_delete_own_or_staff on public.challenge_participants;
create policy challenge_participants_delete_own_or_staff on public.challenge_participants
for delete to authenticated
using (public.is_active_user() and (member_id = (select auth.uid()) or public.is_admin_or_manager()));

grant select, insert, update, delete on public.challenges to authenticated;
grant select, insert, update, delete on public.challenge_participants to authenticated;
