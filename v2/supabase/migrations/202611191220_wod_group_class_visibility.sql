-- Allow confirmed group-class attendees to read the private WODs attached
-- to their published class or live class session. Do not expose these WODs
-- to other members.
-- Safe to re-run: replace the existing assignment visibility policy only.

drop policy if exists wods_read_assigned on public.wods;

create policy wods_read_assigned
on public.wods
for select
to authenticated
using (
  public.is_active_user()
  and (
    exists (
      select 1
      from public.pt_wod_assignments a
      where a.wod_id = public.wods.id
        and a.member_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.pt_program_sessions ps
      join public.pt_programs p on p.id = ps.program_id
      where ps.wod_id = public.wods.id
        and p.client_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.pt_sessions ps
      where ps.client_id = (select auth.uid())
        and ps.status = any (array['planned','published','completed']::text[])
        and public.wods.id = any (coalesce(ps.wod_ids, '{}'::uuid[]))
    )
    or exists (
      select 1
      from public.classes c
      join public.class_bookings b on b.class_id = c.id
      where c.published = true
        and c.wod_ids @> jsonb_build_array(public.wods.id::text)
        and b.member_id = (select auth.uid())
        and b.status = 'confirmed'
    )
    or exists (
      select 1
      from public.class_live_sessions s
      join public.class_bookings b on b.class_id = s.class_id
      where (s.wod_id = public.wods.id
        or s.wod_ids @> jsonb_build_array(public.wods.id::text))
        and b.member_id = (select auth.uid())
        and b.status = 'confirmed'
    )
    or exists (
      select 1
      from public.class_session_wod_completions c
      where c.wod_id = public.wods.id
        and c.member_id = (select auth.uid())
    )
  )
);
