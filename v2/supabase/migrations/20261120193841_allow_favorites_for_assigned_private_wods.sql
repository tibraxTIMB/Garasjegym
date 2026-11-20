DROP POLICY IF EXISTS wod_favorites_insert_own ON public.wod_favorites;
CREATE POLICY wod_favorites_insert_own
ON public.wod_favorites
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND public.is_active_user()
  AND EXISTS (
    SELECT 1 FROM public.wods w
    WHERE w.id = wod_favorites.wod_id
      AND (
        w.is_published = true
        OR public.is_admin_or_manager()
        OR EXISTS (
          SELECT 1 FROM public.pt_sessions ps
          WHERE ps.client_id = (SELECT auth.uid())
            AND w.id = ANY(COALESCE(ps.wod_ids, '{}'::uuid[]))
        )
        OR EXISTS (
          SELECT 1 FROM public.pt_wod_assignments a
          WHERE a.member_id = (SELECT auth.uid())
            AND a.wod_id = w.id
            AND a.status IN ('assigned', 'in_progress', 'completed')
        )
        OR EXISTS (
          SELECT 1 FROM public.pt_program_sessions ps
          JOIN public.pt_programs p ON p.id = ps.program_id
          WHERE p.client_id = (SELECT auth.uid())
            AND ps.wod_id = w.id
            AND ps.archived_at IS NULL
            AND p.archived_at IS NULL
        )
      )
  )
);