DROP POLICY IF EXISTS pt_service_requests_update_combined ON public.pt_service_requests;
CREATE POLICY pt_service_requests_member_cancel
ON public.pt_service_requests AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  member_id = (SELECT (SELECT auth.uid()))
  AND status = 'pending'
)
WITH CHECK (
  member_id = (SELECT (SELECT auth.uid()))
  AND status = 'cancelled'
  AND assigned_coach_id IS NULL
  AND handled_by IS NULL
);
CREATE POLICY pt_service_requests_staff_update
ON public.pt_service_requests AS PERMISSIVE FOR UPDATE TO authenticated
USING (is_admin_or_manager())
WITH CHECK (
  is_admin_or_manager()
  AND handled_by = (SELECT (SELECT auth.uid()))
);