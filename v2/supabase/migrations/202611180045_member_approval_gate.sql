-- Member approval gate for GarasjeGym 2.0.
alter table public.profiles
  add column if not exists email text,
  add column if not exists membership_status text not null default 'approved';

alter table public.profiles drop constraint if exists profiles_membership_status_check;
alter table public.profiles add constraint profiles_membership_status_check
  check (membership_status in ('pending','approved','rejected'));

update public.profiles p set email=u.email
from auth.users u where u.id=p.id and (p.email is null or p.email='');

create index if not exists profiles_membership_status_created_idx
  on public.profiles(membership_status,created_at desc);

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path='public'
as $function$
begin
  insert into public.profiles(id,display_name,role,active,membership_status,email)
  values(new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(coalesce(new.email,''),'@',1)),
    'member',false,'pending',new.email)
  on conflict(id) do update set email=excluded.email;
  return new;
end;
$function$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path='public'
as $function$
  select exists(select 1 from public.profiles p where p.id=auth.uid()
    and p.active=true and p.membership_status='approved');
$function$;

drop policy if exists profile_update_staff on public.profiles;
create policy profile_update_staff on public.profiles for update to authenticated
using (
  public.is_admin()
  or (public.is_admin_or_manager() and role='member'
      and id<>(select auth.uid()) and membership_status='approved')
)
with check (
  public.is_admin()
  or (public.is_admin_or_manager() and role='member'
      and id<>(select auth.uid()) and membership_status='approved')
);

grant select(id,display_name,avatar_url,role,active,created_at,updated_at,email,membership_status)
  on public.profiles to authenticated;
