drop policy if exists classes_read_members on public.classes;

create policy classes_read_members
on public.classes
for select
to authenticated
using (
  (select public.is_admin_or_manager())
  or (
    published = true
    and (select public.is_active_user())
  )
);