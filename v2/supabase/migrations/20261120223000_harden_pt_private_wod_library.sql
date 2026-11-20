-- The PT-only WOD library is private to active, approved member accounts registered as coaches.
DROP POLICY IF EXISTS wods_read_own_pt_library ON public.wods;
CREATE POLICY wods_read_own_pt_library ON public.wods
  FOR SELECT TO authenticated
  USING (
    created_by=auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.pt_coaches c
      JOIN public.profiles p ON p.id=c.user_id
      WHERE c.user_id=auth.uid()
        AND c.is_active=true
        AND p.role='member'
        AND p.active=true
        AND p.membership_status='approved'
    )
  );

DROP POLICY IF EXISTS wods_insert_own_pt_library ON public.wods;
CREATE POLICY wods_insert_own_pt_library ON public.wods
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by=auth.uid()
    AND is_published=false
    AND EXISTS (
      SELECT 1 FROM public.pt_coaches c
      JOIN public.profiles p ON p.id=c.user_id
      WHERE c.user_id=auth.uid()
        AND c.is_active=true
        AND p.role='member'
        AND p.active=true
        AND p.membership_status='approved'
    )
  );

DROP POLICY IF EXISTS wods_update_own_pt_library ON public.wods;
CREATE POLICY wods_update_own_pt_library ON public.wods
  FOR UPDATE TO authenticated
  USING (
    created_by=auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.pt_coaches c
      JOIN public.profiles p ON p.id=c.user_id
      WHERE c.user_id=auth.uid()
        AND c.is_active=true
        AND p.role='member'
        AND p.active=true
        AND p.membership_status='approved'
    )
  )
  WITH CHECK (
    created_by=auth.uid()
    AND is_published=false
    AND EXISTS (
      SELECT 1 FROM public.pt_coaches c
      JOIN public.profiles p ON p.id=c.user_id
      WHERE c.user_id=auth.uid()
        AND c.is_active=true
        AND p.role='member'
        AND p.active=true
        AND p.membership_status='approved'
    )
  );
