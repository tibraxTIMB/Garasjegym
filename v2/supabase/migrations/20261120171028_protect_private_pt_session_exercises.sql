DROP POLICY IF EXISTS pt_session_exercises_read_combined ON public.pt_session_exercises;
CREATE POLICY pt_session_exercises_read_combined
ON public.pt_session_exercises FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND EXISTS (
    SELECT 1
    FROM public.pt_sessions s
    WHERE s.id = pt_session_exercises.session_id
      AND (
        public.is_admin_or_manager()
        OR s.client_id = (SELECT auth.uid())
        OR (s.client_id IS NULL AND s.status = 'published')
        OR (
          s.client_id IS NOT NULL
          AND app_private.is_pt_coach_for_member(s.client_id)
        )
        -- Retain history access for the member who booked a public PT slot,
        -- even after the appointment has been completed or cancelled.
        OR (
          s.client_id IS NULL
          AND app_private.has_own_pt_session_booking(s.id)
        )
      )
  )
);
