-- The app exposes class booking administration to both admin and manager
-- staff. Align the database policies with the shared is_admin_or_manager()
-- staff predicate used by classes and PT/WOD administration.

drop policy if exists class_bookings_delete_admin on public.class_bookings;
create policy class_bookings_delete_admin
on public.class_bookings
for delete
to authenticated
using ((select public.is_admin_or_manager()));

drop policy if exists class_bookings_update_own_or_admin on public.class_bookings;
create policy class_bookings_update_own_or_admin
on public.class_bookings
for update
to authenticated
using (
  (member_id = (select auth.uid()) and (select public.is_active_user()))
  or (select public.is_admin_or_manager())
)
with check (
  (
    member_id = (select auth.uid())
    and (select public.is_active_user())
    and status = 'cancelled'
  )
  or (select public.is_admin_or_manager())
);
