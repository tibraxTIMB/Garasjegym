-- Avoid per-row auth context evaluation in PT coach RLS policies.
DROP POLICY IF EXISTS pt_client_goals_insert_assigned_coach ON public.pt_client_goals;
CREATE POLICY pt_client_goals_insert_assigned_coach ON public.pt_client_goals
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(member_id)
  );

DROP POLICY IF EXISTS pt_programs_insert_assigned_coach ON public.pt_programs;
CREATE POLICY pt_programs_insert_assigned_coach ON public.pt_programs
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_active_user())
    AND created_by=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(client_id)
  );

DROP POLICY IF EXISTS pt_messages_delete_assigned_coach ON public.pt_messages;
CREATE POLICY pt_messages_delete_assigned_coach ON public.pt_messages
  FOR DELETE TO authenticated
  USING (
    sender_id=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(client_id)
  );

DROP POLICY IF EXISTS pt_messages_insert_assigned_coach ON public.pt_messages;
CREATE POLICY pt_messages_insert_assigned_coach ON public.pt_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_active_user())
    AND sender_id=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(client_id)
  );

DROP POLICY IF EXISTS pt_client_notes_assigned_coach_all ON public.pt_client_notes;
CREATE POLICY pt_client_notes_assigned_coach_all ON public.pt_client_notes
  FOR ALL TO authenticated
  USING (
    coach_id=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(client_id)
  )
  WITH CHECK (
    coach_id=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(client_id)
  );

DROP POLICY IF EXISTS pt_checkins_insert_assigned_coach ON public.pt_checkins;
CREATE POLICY pt_checkins_insert_assigned_coach ON public.pt_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(member_id)
    AND status='pending'
  );

DROP POLICY IF EXISTS pt_service_requests_update_assigned_coach ON public.pt_service_requests;
CREATE POLICY pt_service_requests_update_assigned_coach ON public.pt_service_requests
  FOR UPDATE TO authenticated
  USING (
    assigned_coach_id=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(member_id)
  )
  WITH CHECK (
    assigned_coach_id=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(member_id)
    AND handled_by=(SELECT auth.uid())
  );

DROP POLICY IF EXISTS pt_wod_assignments_insert_assigned_coach ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_insert_assigned_coach ON public.pt_wod_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    assigned_by=(SELECT auth.uid())
    AND app_private.is_pt_coach_for_member(member_id)
  );

DROP POLICY IF EXISTS pt_sessions_insert_assigned_coach ON public.pt_sessions;
CREATE POLICY pt_sessions_insert_assigned_coach ON public.pt_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by=(SELECT auth.uid())
    AND client_id IS NOT NULL
    AND app_private.is_pt_coach_for_member(client_id)
  );

DROP POLICY IF EXISTS wods_insert_own_pt_library ON public.wods;
CREATE POLICY wods_insert_own_pt_library ON public.wods
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by=(SELECT auth.uid())
    AND is_published=false
    AND EXISTS (
      SELECT 1 FROM public.pt_coaches c
      JOIN public.profiles p ON p.id=c.user_id
      WHERE c.user_id=(SELECT auth.uid())
        AND c.is_active=true
        AND p.role='member'
        AND p.active=true
        AND p.membership_status='approved'
    )
  );

DROP POLICY IF EXISTS wods_read_own_pt_library ON public.wods;
CREATE POLICY wods_read_own_pt_library ON public.wods
  FOR SELECT TO authenticated
  USING (
    created_by=(SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pt_coaches c
      JOIN public.profiles p ON p.id=c.user_id
      WHERE c.user_id=(SELECT auth.uid())
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
    created_by=(SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pt_coaches c
      JOIN public.profiles p ON p.id=c.user_id
      WHERE c.user_id=(SELECT auth.uid())
        AND c.is_active=true
        AND p.role='member'
        AND p.active=true
        AND p.membership_status='approved'
    )
  )
  WITH CHECK (
    created_by=(SELECT auth.uid())
    AND is_published=false
    AND EXISTS (
      SELECT 1 FROM public.pt_coaches c
      JOIN public.profiles p ON p.id=c.user_id
      WHERE c.user_id=(SELECT auth.uid())
        AND c.is_active=true
        AND p.role='member'
        AND p.active=true
        AND p.membership_status='approved'
    )
  );
