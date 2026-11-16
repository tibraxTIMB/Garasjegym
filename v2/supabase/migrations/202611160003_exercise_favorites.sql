-- Member exercise favourites, compatible with the 1.8.x data contract
create table if not exists public.exercise_favorites (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 exercise_name text not null,
 created_at timestamptz not null default now(),
 constraint exercise_favorites_user_exercise_unique unique(user_id,exercise_name)
);
alter table public.exercise_favorites enable row level security;
drop policy if exists exercise_favorites_own_all on public.exercise_favorites;
create policy exercise_favorites_own_all on public.exercise_favorites
for all to authenticated
using (user_id=auth.uid() and public.is_active_user())
with check (user_id=auth.uid() and public.is_active_user());
