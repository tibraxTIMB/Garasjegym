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
  )
);