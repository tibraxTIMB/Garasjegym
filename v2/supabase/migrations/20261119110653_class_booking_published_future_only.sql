drop policy if exists class_bookings_insert_own on public.class_bookings;

create policy class_bookings_insert_own
on public.class_bookings
for insert
to authenticated
with check (
  member_id = (select auth.uid())
  and (select public.is_active_user())
  and status = any (array['confirmed','pending']::text[])
  and exists (
    select 1 from public.classes c
    where c.id = public.class_bookings.class_id
      and c.published = true
      and c.starts_at > now()
  )
);