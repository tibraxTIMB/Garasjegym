DROP POLICY IF EXISTS pt_sessions_read ON public.pt_sessions;
CREATE POLICY pt_sessions_read
ON public.pt_sessions FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR client_id = (SELECT auth.uid())
    OR (client_id IS NULL AND status = 'published')
    OR (
      client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(client_id)
    )
    OR app_private.has_own_pt_session_booking(id)
  )
);
