DROP POLICY IF EXISTS pt_bookings_read ON public.pt_bookings;
CREATE POLICY pt_bookings_read
ON public.pt_bookings
FOR SELECT
TO authenticated
USING (
  public.is_active_user()
  AND (
    member_id = (SELECT auth.uid())
    OR public.is_admin_or_manager()
    OR app_private.is_pt_coach_for_member(member_id)
  )
);
