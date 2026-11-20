DROP POLICY IF EXISTS pt_client_assignments_read ON public.pt_client_assignments;
CREATE POLICY pt_client_assignments_read
ON public.pt_client_assignments FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    member_id = (SELECT auth.uid())
    OR coach_user_id = (SELECT auth.uid())
    OR public.is_admin_or_manager()
  )
);

DROP POLICY IF EXISTS pt_checkins_read_own_or_staff ON public.pt_checkins;
CREATE POLICY pt_checkins_read_own_or_staff
ON public.pt_checkins FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    member_id = (SELECT auth.uid())
    OR public.is_admin_or_manager()
    OR app_private.is_pt_coach_for_member(member_id)
  )
);

DROP POLICY IF EXISTS pt_checkins_staff_insert ON public.pt_checkins;
CREATE POLICY pt_checkins_staff_insert
ON public.pt_checkins FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND created_by = (SELECT auth.uid())
  AND (
    public.is_admin_or_manager()
    OR (
      app_private.is_pt_coach_for_member(member_id)
      AND status = 'pending'
    )
  )
);

DROP POLICY IF EXISTS pt_checkins_update_member_or_staff ON public.pt_checkins;
CREATE POLICY pt_checkins_update_member_or_staff
ON public.pt_checkins FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR (member_id = (SELECT auth.uid()) AND status = 'pending')
    OR app_private.is_pt_coach_for_member(member_id)
  )
)
WITH CHECK (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR (member_id = (SELECT auth.uid()) AND status = 'submitted')
    OR app_private.is_pt_coach_for_member(member_id)
  )
);

DROP POLICY IF EXISTS pt_intakes_insert_own ON public.pt_intakes;
CREATE POLICY pt_intakes_insert_own
ON public.pt_intakes FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND member_id = (SELECT auth.uid())
  AND status = 'new'
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);

DROP POLICY IF EXISTS pt_intakes_read_own_or_staff ON public.pt_intakes;
CREATE POLICY pt_intakes_read_own_or_staff
ON public.pt_intakes FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    member_id = (SELECT auth.uid())
    OR public.is_admin_or_manager()
    OR app_private.is_pt_coach_for_member(member_id)
  )
);

DROP POLICY IF EXISTS pt_intakes_staff_update ON public.pt_intakes;
CREATE POLICY pt_intakes_staff_update
ON public.pt_intakes FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR app_private.is_pt_coach_for_member(member_id)
  )
)
WITH CHECK (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR app_private.is_pt_coach_for_member(member_id)
  )
);

DROP POLICY IF EXISTS pt_wod_assignments_read_own_or_staff ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_read_own_or_staff
ON public.pt_wod_assignments FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    member_id = (SELECT auth.uid())
    OR public.is_admin_or_manager()
    OR app_private.is_pt_coach_for_member(member_id)
  )
);

DROP POLICY IF EXISTS pt_wod_assignments_staff_insert ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_staff_insert
ON public.pt_wod_assignments FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND (
    (public.is_admin_or_manager() AND assigned_by = (SELECT auth.uid()))
    OR (
      assigned_by = (SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(member_id)
    )
  )
);

DROP POLICY IF EXISTS pt_wod_assignments_staff_update ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_staff_update
ON public.pt_wod_assignments FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR member_id = (SELECT auth.uid())
    OR app_private.is_pt_coach_for_member(member_id)
  )
)
WITH CHECK (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR member_id = (SELECT auth.uid())
    OR app_private.is_pt_coach_for_member(member_id)
  )
);
