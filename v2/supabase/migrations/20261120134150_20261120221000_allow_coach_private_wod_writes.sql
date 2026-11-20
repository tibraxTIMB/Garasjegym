-- Allow a registered PT to create or edit only their own unpublished PT-library WODs.
-- Whole-member publication and editing other coaches' WODs remain admin-only.
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
        AND p.active=true
        AND p.membership_status='approved'
    )
  );
