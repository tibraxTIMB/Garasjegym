-- Date-based reuse of existing WODs as a daily workout or class-specific workout.
-- The legacy daily_wod row is preserved and copied into today's schedule once.
create table if not exists public.wod_daily_schedules (
  id uuid primary key default gen_random_uuid(),
  wod_id uuid not null references public.wods(id) on delete restrict,
  scheduled_date date not null,
  target_class_id uuid references public.classes(id) on delete cascade,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wod_daily_schedules_global_date_uidx
  on public.wod_daily_schedules(scheduled_date)
  where target_class_id is null;

create unique index if not exists wod_daily_schedules_class_date_uidx
  on public.wod_daily_schedules(scheduled_date, target_class_id)
  where target_class_id is not null;

create index if not exists wod_daily_schedules_wod_date_idx
  on public.wod_daily_schedules(wod_id, scheduled_date);

alter table public.wod_daily_schedules enable row level security;
grant select, insert, update, delete on public.wod_daily_schedules to authenticated;

drop policy if exists wod_daily_schedules_manage_staff on public.wod_daily_schedules;
create policy wod_daily_schedules_manage_staff
  on public.wod_daily_schedules
  for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists wod_daily_schedules_read_visible on public.wod_daily_schedules;
create policy wod_daily_schedules_read_visible
  on public.wod_daily_schedules
  for select
  to authenticated
  using (
    public.is_active_user()
    and is_published = true
    and (
      target_class_id is null
      or exists (
        select 1
        from public.class_bookings b
        join public.classes c on c.id = b.class_id
        where b.class_id = wod_daily_schedules.target_class_id
          and b.member_id = (select auth.uid())
          and b.status = 'confirmed'
          and c.published = true
          and c.cancelled_at is null
      )
    )
  );

drop policy if exists wods_read_daily_schedule on public.wods;
create policy wods_read_daily_schedule
  on public.wods
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1
      from public.wod_daily_schedules d
      where d.wod_id = wods.id
        and d.is_published = true
        and (
          d.target_class_id is null
          or exists (
            select 1
            from public.class_bookings b
            join public.classes c on c.id = b.class_id
            where b.class_id = d.target_class_id
              and b.member_id = (select auth.uid())
              and b.status = 'confirmed'
              and c.published = true
              and c.cancelled_at is null
          )
        )
    )
  );

-- Preserve the currently selected daily WOD as today's dated publication.
insert into public.wod_daily_schedules
  (wod_id, scheduled_date, is_published, created_by)
select d.wod_id, current_date, true, d.set_by
from public.daily_wod d
where d.id = true
  and not exists (
    select 1
    from public.wod_daily_schedules existing
    where existing.scheduled_date = current_date
      and existing.target_class_id is null
  );
