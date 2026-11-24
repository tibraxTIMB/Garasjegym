-- Fix ambiguous column binding in pt_wod_feedback RLS.
-- The program's client_id must match the feedback row's client_id (not itself).
drop policy if exists pt_wod_feedback_read_involved on public.pt_wod_feedback;
create policy pt_wod_feedback_read_involved on public.pt_wod_feedback
for select to authenticated
using (
 public.is_active_user()
 and (
  pt_wod_feedback.client_id=(select auth.uid())
  or public.is_admin_or_manager()
  or app_private.is_pt_coach_for_member(pt_wod_feedback.client_id)
 )
 and (
  (
   pt_wod_feedback.assignment_id is not null
   and exists (
    select 1 from public.pt_wod_assignments a
     where a.id=pt_wod_feedback.assignment_id
       and a.member_id=pt_wod_feedback.client_id
   )
  )
  or
  (
   pt_wod_feedback.program_session_id is not null
   and exists (
    select 1 from public.pt_program_sessions ps
    join public.pt_programs p on p.id=ps.program_id
    where ps.id=pt_wod_feedback.program_session_id
      and p.client_id=pt_wod_feedback.client_id
   )
  )
 )
);
