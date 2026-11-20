
-- PT Studio foundation: coach registry, explicit client relationships and service requests.
create table if not exists public.pt_coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  bio text not null default '',
  specialties text[] not null default '{}',
  capacity integer not null default 8 check (capacity between 0 and 100),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pt_coaches_active_idx on public.pt_coaches(is_active);

create table if not exists public.pt_client_assignments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  coach_user_id uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  status text not null default 'active' check(status in ('active','ended')),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status='active' and ended_at is null) or (status='ended' and ended_at is not null))
);
create unique index if not exists pt_client_assignments_one_active_idx
  on public.pt_client_assignments(member_id) where status='active';
create index if not exists pt_client_assignments_coach_active_idx
  on public.pt_client_assignments(coach_user_id,status);

create table if not exists public.pt_services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  suitable_for text not null default '',
  duration_label text not null default '',
  price_label text not null default '',
  category text not null default 'personleg trening',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pt_services_active_order_idx on public.pt_services(is_active,sort_order,title);

create table if not exists public.pt_service_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.pt_services(id) on delete set null,
  service_title text not null,
  member_note text not null default '',
  preferred_at timestamptz,
  status text not null default 'pending' check(status in ('pending','reviewing','assigned','declined','cancelled','completed')),
  assigned_coach_id uuid references public.profiles(id),
  handled_by uuid references public.profiles(id),
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pt_service_requests_member_idx on public.pt_service_requests(member_id,created_at desc);
create index if not exists pt_service_requests_status_idx on public.pt_service_requests(status,created_at desc);

alter table public.pt_coaches enable row level security;
alter table public.pt_client_assignments enable row level security;
alter table public.pt_services enable row level security;
alter table public.pt_service_requests enable row level security;

drop policy if exists pt_coaches_read on public.pt_coaches;
create policy pt_coaches_read on public.pt_coaches for select to authenticated
using (is_active or public.is_admin_or_manager() or user_id=(select auth.uid()));
drop policy if exists pt_coaches_staff_manage on public.pt_coaches;
create policy pt_coaches_staff_manage on public.pt_coaches for all to authenticated
using (public.is_admin_or_manager()) with check (public.is_admin_or_manager() and created_by=(select auth.uid()));

drop policy if exists pt_client_assignments_read on public.pt_client_assignments;
create policy pt_client_assignments_read on public.pt_client_assignments for select to authenticated
using (member_id=(select auth.uid()) or coach_user_id=(select auth.uid()) or public.is_admin_or_manager());
drop policy if exists pt_client_assignments_staff_manage on public.pt_client_assignments;
create policy pt_client_assignments_staff_manage on public.pt_client_assignments for all to authenticated
using (public.is_admin_or_manager()) with check (public.is_admin_or_manager() and assigned_by=(select auth.uid()));

drop policy if exists pt_services_read on public.pt_services;
create policy pt_services_read on public.pt_services for select to authenticated
using (is_active or public.is_admin_or_manager());
drop policy if exists pt_services_staff_manage on public.pt_services;
create policy pt_services_staff_manage on public.pt_services for all to authenticated
using (public.is_admin_or_manager()) with check (public.is_admin_or_manager() and created_by=(select auth.uid()));

drop policy if exists pt_service_requests_read on public.pt_service_requests;
create policy pt_service_requests_read on public.pt_service_requests for select to authenticated
using (member_id=(select auth.uid()) or public.is_admin_or_manager() or assigned_coach_id=(select auth.uid()));
drop policy if exists pt_service_requests_member_insert on public.pt_service_requests;
create policy pt_service_requests_member_insert on public.pt_service_requests for insert to authenticated
with check (member_id=(select auth.uid()) and status='pending' and assigned_coach_id is null and handled_by is null);
drop policy if exists pt_service_requests_member_cancel on public.pt_service_requests;
create policy pt_service_requests_member_cancel on public.pt_service_requests for update to authenticated
using (member_id=(select auth.uid()) and status='pending')
with check (member_id=(select auth.uid()) and status='cancelled' and assigned_coach_id is null and handled_by is null);
drop policy if exists pt_service_requests_staff_update on public.pt_service_requests;
create policy pt_service_requests_staff_update on public.pt_service_requests for update to authenticated
using (public.is_admin_or_manager())
with check (public.is_admin_or_manager() and handled_by=(select auth.uid()));

grant select,insert,update,delete on public.pt_coaches,public.pt_client_assignments,public.pt_services,public.pt_service_requests to authenticated;
