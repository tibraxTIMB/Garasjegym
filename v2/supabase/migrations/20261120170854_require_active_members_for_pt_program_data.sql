DROP POLICY IF EXISTS pt_client_goals_read ON public.pt_client_goals;
CREATE POLICY pt_client_goals_read
ON public.pt_client_goals FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    (member_id = (SELECT auth.uid()) AND is_visible)
    OR public.is_admin_or_manager()
    OR app_private.is_pt_coach_for_member(member_id)
  )
);

DROP POLICY IF EXISTS pt_programs_read_own_or_staff ON public.pt_programs;
CREATE POLICY pt_programs_read_own_or_staff
ON public.pt_programs FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR (client_id = (SELECT auth.uid()) AND archived_at IS NULL)
    OR app_private.is_pt_coach_for_member(client_id)
  )
);

DROP POLICY IF EXISTS pt_programs_staff_insert ON public.pt_programs;
CREATE POLICY pt_programs_staff_insert
ON public.pt_programs FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND (
    (public.is_admin_or_manager() AND created_by = (SELECT auth.uid()))
    OR (created_by = (SELECT auth.uid()) AND app_private.is_pt_coach_for_member(client_id))
  )
);

DROP POLICY IF EXISTS pt_programs_staff_update ON public.pt_programs;
CREATE POLICY pt_programs_staff_update
ON public.pt_programs FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR app_private.is_pt_coach_for_member(client_id)
  )
)
WITH CHECK (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR app_private.is_pt_coach_for_member(client_id)
  )
);

DROP POLICY IF EXISTS pt_program_sessions_read_parent ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_read_parent
ON public.pt_program_sessions FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR (
      archived_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.pt_programs p
        WHERE p.id = pt_program_sessions.program_id
          AND p.client_id = (SELECT auth.uid())
          AND p.archived_at IS NULL
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.pt_programs p
      WHERE p.id = pt_program_sessions.program_id
        AND app_private.is_pt_coach_for_member(p.client_id)
    )
  )
);

DROP POLICY IF EXISTS pt_program_sessions_staff_insert ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_staff_insert
ON public.pt_program_sessions FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR EXISTS (
      SELECT 1
      FROM public.pt_programs p
      WHERE p.id = pt_program_sessions.program_id
        AND p.archived_at IS NULL
        AND app_private.is_pt_coach_for_member(p.client_id)
    )
  )
);

DROP POLICY IF EXISTS pt_program_sessions_update_member_or_staff ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_update_member_or_staff
ON public.pt_program_sessions FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR (
      status IN ('planned', 'in_progress')
      AND EXISTS (
        SELECT 1
        FROM public.pt_programs p
        WHERE p.id = pt_program_sessions.program_id
          AND p.client_id = (SELECT auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.pt_programs p
      WHERE p.id = pt_program_sessions.program_id
        AND app_private.is_pt_coach_for_member(p.client_id)
    )
  )
)
WITH CHECK (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR (
      status IN ('completed', 'in_progress')
      AND EXISTS (
        SELECT 1
        FROM public.pt_programs p
        WHERE p.id = pt_program_sessions.program_id
          AND p.client_id = (SELECT auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.pt_programs p
      WHERE p.id = pt_program_sessions.program_id
        AND app_private.is_pt_coach_for_member(p.client_id)
    )
  )
);

DROP POLICY IF EXISTS pt_service_requests_member_insert ON public.pt_service_requests;
CREATE POLICY pt_service_requests_member_insert
ON public.pt_service_requests FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND member_id = (SELECT auth.uid())
  AND status = 'pending'
  AND assigned_coach_id IS NULL
  AND handled_by IS NULL
);

DROP POLICY IF EXISTS pt_service_requests_read ON public.pt_service_requests;
CREATE POLICY pt_service_requests_read
ON public.pt_service_requests FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    member_id = (SELECT auth.uid())
    OR public.is_admin_or_manager()
    OR assigned_coach_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS pt_service_requests_update_combined ON public.pt_service_requests;
CREATE POLICY pt_service_requests_update_combined
ON public.pt_service_requests FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND (
    (member_id = (SELECT auth.uid()) AND status = 'pending')
    OR public.is_admin_or_manager()
    OR (
      assigned_coach_id = (SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(member_id)
    )
  )
)
WITH CHECK (
  public.is_active_user()
  AND (
    (
      member_id = (SELECT auth.uid())
      AND status = 'cancelled'
      AND assigned_coach_id IS NULL
      AND handled_by IS NULL
    )
    OR (
      public.is_admin_or_manager()
      AND handled_by = (SELECT auth.uid())
    )
    OR (
      assigned_coach_id = (SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(member_id)
      AND handled_by = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS training_sessions_select_own_or_staff ON public.training_sessions;
CREATE POLICY training_sessions_select_own_or_staff
ON public.training_sessions FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    member_id = (SELECT auth.uid())
    OR created_by = (SELECT auth.uid())
    OR public.is_admin_or_manager()
  )
);

DROP POLICY IF EXISTS training_sessions_insert_staff ON public.training_sessions;
CREATE POLICY training_sessions_insert_staff
ON public.training_sessions FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND created_by = (SELECT auth.uid())
  AND public.is_admin_or_manager()
);

DROP POLICY IF EXISTS training_sessions_update_staff_or_owner ON public.training_sessions;
CREATE POLICY training_sessions_update_staff_or_owner
ON public.training_sessions FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND (
    created_by = (SELECT auth.uid())
    OR member_id = (SELECT auth.uid())
    OR public.is_admin_or_manager()
  )
)
WITH CHECK (
  public.is_active_user()
  AND (
    created_by = (SELECT auth.uid())
    OR member_id = (SELECT auth.uid())
    OR public.is_admin_or_manager()
  )
);

DROP POLICY IF EXISTS training_session_wods_read_combined ON public.training_session_wods;
CREATE POLICY training_session_wods_read_combined
ON public.training_session_wods FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    EXISTS (
      SELECT 1
      FROM public.training_sessions s
      WHERE s.id = training_session_wods.session_id
        AND (
          s.member_id = (SELECT auth.uid())
          OR s.created_by = (SELECT auth.uid())
          OR public.is_admin_or_manager()
        )
    )
    OR public.is_admin_or_manager()
  )
);
