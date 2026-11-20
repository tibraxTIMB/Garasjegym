-- Consolidate PT coach access into the existing policies for each operation.
-- This preserves row-level predicates but avoids repeated permissive-policy evaluation.

-- Profiles: user, admin/manager, or only the PT's currently assigned clients.
DROP POLICY IF EXISTS profiles_read_assigned_pt_clients ON public.profiles;
DROP POLICY IF EXISTS profile_select_own_or_staff ON public.profiles;
CREATE POLICY profile_select_own_or_staff ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id=(SELECT auth.uid())
    OR (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(id)
  );

-- Legacy PT bookings.
DROP POLICY IF EXISTS pt_bookings_read_assigned_coach ON public.pt_bookings;
DROP POLICY IF EXISTS pt_bookings_read ON public.pt_bookings;
CREATE POLICY pt_bookings_read ON public.pt_bookings
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      member_id=(SELECT auth.uid())
      OR (SELECT public.is_admin_or_manager())
      OR EXISTS (
        SELECT 1 FROM public.pt_sessions s
        WHERE s.id=pt_bookings.session_id
          AND s.client_id IS NOT NULL
          AND app_private.is_pt_coach_for_member(s.client_id)
      )
    )
  );

-- Check-ins: member submission rules remain narrower than coach/admin review rights.
DROP POLICY IF EXISTS pt_checkins_insert_assigned_coach ON public.pt_checkins;
DROP POLICY IF EXISTS pt_checkins_staff_insert ON public.pt_checkins;
CREATE POLICY pt_checkins_staff_insert ON public.pt_checkins
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT public.is_admin_or_manager())
      AND created_by=(SELECT auth.uid())
    )
    OR (
      created_by=(SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(member_id)
      AND status='pending'
    )
  );

DROP POLICY IF EXISTS pt_checkins_read_assigned_coach ON public.pt_checkins;
DROP POLICY IF EXISTS pt_checkins_read_own_or_staff ON public.pt_checkins;
CREATE POLICY pt_checkins_read_own_or_staff ON public.pt_checkins
  FOR SELECT TO authenticated
  USING (
    member_id=(SELECT auth.uid())
    OR (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(member_id)
  );

DROP POLICY IF EXISTS pt_checkins_update_assigned_coach ON public.pt_checkins;
DROP POLICY IF EXISTS pt_checkins_update_member_or_staff ON public.pt_checkins;
CREATE POLICY pt_checkins_update_member_or_staff ON public.pt_checkins
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR (
      member_id=(SELECT auth.uid())
      AND status='pending'
    )
    OR app_private.is_pt_coach_for_member(member_id)
  )
  WITH CHECK (
    (SELECT public.is_admin_or_manager())
    OR (
      member_id=(SELECT auth.uid())
      AND status='submitted'
    )
    OR app_private.is_pt_coach_for_member(member_id)
  );

-- Client goals.
DROP POLICY IF EXISTS pt_client_goals_delete_assigned_coach ON public.pt_client_goals;
DROP POLICY IF EXISTS pt_client_goals_staff_delete ON public.pt_client_goals;
CREATE POLICY pt_client_goals_staff_delete ON public.pt_client_goals
  FOR DELETE TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(member_id)
  );

DROP POLICY IF EXISTS pt_client_goals_insert_assigned_coach ON public.pt_client_goals;
DROP POLICY IF EXISTS pt_client_goals_staff_insert ON public.pt_client_goals;
CREATE POLICY pt_client_goals_staff_insert ON public.pt_client_goals
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT public.is_admin_or_manager())
      AND created_by=(SELECT auth.uid())
    )
    OR (
      created_by=(SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(member_id)
    )
  );

DROP POLICY IF EXISTS pt_client_goals_read_assigned_coach ON public.pt_client_goals;
DROP POLICY IF EXISTS pt_client_goals_read ON public.pt_client_goals;
CREATE POLICY pt_client_goals_read ON public.pt_client_goals
  FOR SELECT TO authenticated
  USING (
    (member_id=(SELECT auth.uid()) AND is_visible)
    OR (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(member_id)
  );

DROP POLICY IF EXISTS pt_client_goals_update_assigned_coach ON public.pt_client_goals;
DROP POLICY IF EXISTS pt_client_goals_staff_update ON public.pt_client_goals;
CREATE POLICY pt_client_goals_staff_update ON public.pt_client_goals
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(member_id)
  )
  WITH CHECK (
    (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(member_id)
  );

-- Private PT notes: managers retain existing administration access; coaches only their own assignment.
DROP POLICY IF EXISTS pt_client_notes_assigned_coach_all ON public.pt_client_notes;
DROP POLICY IF EXISTS pt_client_notes_staff_all ON public.pt_client_notes;
CREATE POLICY pt_client_notes_staff_all ON public.pt_client_notes
  FOR ALL TO authenticated
  USING (
    (
      (SELECT public.is_active_user())
      AND (SELECT public.is_admin_or_manager())
    )
    OR (
      coach_id=(SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(client_id)
    )
  )
  WITH CHECK (
    (
      (SELECT public.is_active_user())
      AND (SELECT public.is_admin_or_manager())
      AND coach_id=(SELECT auth.uid())
    )
    OR (
      coach_id=(SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(client_id)
    )
  );

-- Intake forms.
DROP POLICY IF EXISTS pt_intakes_read_assigned_coach ON public.pt_intakes;
DROP POLICY IF EXISTS pt_intakes_read_own_or_staff ON public.pt_intakes;
CREATE POLICY pt_intakes_read_own_or_staff ON public.pt_intakes
  FOR SELECT TO authenticated
  USING (
    member_id=(SELECT auth.uid())
    OR (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(member_id)
  );

DROP POLICY IF EXISTS pt_intakes_update_assigned_coach ON public.pt_intakes;
DROP POLICY IF EXISTS pt_intakes_staff_update ON public.pt_intakes;
CREATE POLICY pt_intakes_staff_update ON public.pt_intakes
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(member_id)
  )
  WITH CHECK (
    (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(member_id)
  );

-- PT dialogue.
DROP POLICY IF EXISTS pt_messages_delete_assigned_coach ON public.pt_messages;
DROP POLICY IF EXISTS pt_messages_delete_participants_or_staff ON public.pt_messages;
CREATE POLICY pt_messages_delete_participants_or_staff ON public.pt_messages
  FOR DELETE TO authenticated
  USING (
    (
      (SELECT public.is_active_user())
      AND (
        sender_id=(SELECT auth.uid())
        OR client_id=(SELECT auth.uid())
      )
    )
    OR (SELECT public.is_admin_or_manager())
    OR (
      sender_id=(SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(client_id)
    )
  );

DROP POLICY IF EXISTS pt_messages_insert_assigned_coach ON public.pt_messages;
DROP POLICY IF EXISTS pt_messages_insert ON public.pt_messages;
CREATE POLICY pt_messages_insert ON public.pt_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_active_user())
    AND sender_id=(SELECT auth.uid())
    AND (
      client_id=(SELECT auth.uid())
      OR (SELECT public.is_admin_or_manager())
      OR app_private.is_pt_coach_for_member(client_id)
    )
  );

DROP POLICY IF EXISTS pt_messages_read_assigned_coach ON public.pt_messages;
DROP POLICY IF EXISTS pt_messages_read ON public.pt_messages;
CREATE POLICY pt_messages_read ON public.pt_messages
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      client_id=(SELECT auth.uid())
      OR (SELECT public.is_admin_or_manager())
      OR app_private.is_pt_coach_for_member(client_id)
    )
  );

-- Programme sessions.
DROP POLICY IF EXISTS pt_program_sessions_insert_assigned_coach ON public.pt_program_sessions;
DROP POLICY IF EXISTS pt_program_sessions_staff_insert ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_staff_insert ON public.pt_program_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin_or_manager())
    OR EXISTS (
      SELECT 1 FROM public.pt_programs p
      WHERE p.id=pt_program_sessions.program_id
        AND p.archived_at IS NULL
        AND app_private.is_pt_coach_for_member(p.client_id)
    )
  );

DROP POLICY IF EXISTS pt_program_sessions_read_assigned_coach ON public.pt_program_sessions;
DROP POLICY IF EXISTS pt_program_sessions_read_parent ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_read_parent ON public.pt_program_sessions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR (
      archived_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.pt_programs p
        WHERE p.id=pt_program_sessions.program_id
          AND p.client_id=(SELECT auth.uid())
          AND p.archived_at IS NULL
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.pt_programs p
      WHERE p.id=pt_program_sessions.program_id
        AND app_private.is_pt_coach_for_member(p.client_id)
    )
  );

DROP POLICY IF EXISTS pt_program_sessions_update_assigned_coach ON public.pt_program_sessions;
DROP POLICY IF EXISTS pt_program_sessions_update_member_or_staff ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_update_member_or_staff ON public.pt_program_sessions
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR (
      status=ANY(ARRAY['planned'::text,'in_progress'::text])
      AND EXISTS (
        SELECT 1 FROM public.pt_programs p
        WHERE p.id=pt_program_sessions.program_id
          AND p.client_id=(SELECT auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.pt_programs p
      WHERE p.id=pt_program_sessions.program_id
        AND app_private.is_pt_coach_for_member(p.client_id)
    )
  )
  WITH CHECK (
    (SELECT public.is_admin_or_manager())
    OR (
      status=ANY(ARRAY['completed'::text,'in_progress'::text])
      AND EXISTS (
        SELECT 1 FROM public.pt_programs p
        WHERE p.id=pt_program_sessions.program_id
          AND p.client_id=(SELECT auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.pt_programs p
      WHERE p.id=pt_program_sessions.program_id
        AND app_private.is_pt_coach_for_member(p.client_id)
    )
  );

-- PT programme records.
DROP POLICY IF EXISTS pt_programs_insert_assigned_coach ON public.pt_programs;
DROP POLICY IF EXISTS pt_programs_staff_insert ON public.pt_programs;
CREATE POLICY pt_programs_staff_insert ON public.pt_programs
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT public.is_admin_or_manager())
      AND created_by=(SELECT auth.uid())
    )
    OR (
      (SELECT public.is_active_user())
      AND created_by=(SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(client_id)
    )
  );

DROP POLICY IF EXISTS pt_programs_read_assigned_coach ON public.pt_programs;
DROP POLICY IF EXISTS pt_programs_read_own_or_staff ON public.pt_programs;
CREATE POLICY pt_programs_read_own_or_staff ON public.pt_programs
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR (client_id=(SELECT auth.uid()) AND archived_at IS NULL)
    OR app_private.is_pt_coach_for_member(client_id)
  );

DROP POLICY IF EXISTS pt_programs_update_assigned_coach ON public.pt_programs;
DROP POLICY IF EXISTS pt_programs_staff_update ON public.pt_programs;
CREATE POLICY pt_programs_staff_update ON public.pt_programs
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(client_id)
  )
  WITH CHECK (
    (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(client_id)
  );

-- Legacy PT requests.
DROP POLICY IF EXISTS pt_requests_read_assigned_coach ON public.pt_requests;
DROP POLICY IF EXISTS pt_requests_read ON public.pt_requests;
CREATE POLICY pt_requests_read ON public.pt_requests
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      member_id=(SELECT auth.uid())
      OR (SELECT public.is_admin_or_manager())
      OR app_private.is_pt_coach_for_member(member_id)
    )
  );

DROP POLICY IF EXISTS pt_requests_update_assigned_coach ON public.pt_requests;
DROP POLICY IF EXISTS pt_requests_update ON public.pt_requests;
CREATE POLICY pt_requests_update ON public.pt_requests
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      (SELECT public.is_admin_or_manager())
      OR (
        member_id=(SELECT auth.uid())
        AND status=ANY(ARRAY['pending'::text,'cancelled'::text])
      )
      OR app_private.is_pt_coach_for_member(member_id)
    )
  )
  WITH CHECK (
    (SELECT public.is_active_user())
    AND (
      (SELECT public.is_admin_or_manager())
      OR (
        member_id=(SELECT auth.uid())
        AND status=ANY(ARRAY['pending'::text,'cancelled'::text])
      )
      OR app_private.is_pt_coach_for_member(member_id)
    )
  );

-- PT service request handling.
DROP POLICY IF EXISTS pt_service_requests_update_assigned_coach ON public.pt_service_requests;
DROP POLICY IF EXISTS pt_service_requests_update_combined ON public.pt_service_requests;
CREATE POLICY pt_service_requests_update_combined ON public.pt_service_requests
  FOR UPDATE TO authenticated
  USING (
    (
      member_id=(SELECT auth.uid())
      AND status='pending'
    )
    OR (SELECT public.is_admin_or_manager())
    OR (
      assigned_coach_id=(SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(member_id)
    )
  )
  WITH CHECK (
    (
      member_id=(SELECT auth.uid())
      AND status='cancelled'
      AND assigned_coach_id IS NULL
      AND handled_by IS NULL
    )
    OR (
      (SELECT public.is_admin_or_manager())
      AND handled_by=(SELECT auth.uid())
    )
    OR (
      assigned_coach_id=(SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(member_id)
      AND handled_by=(SELECT auth.uid())
    )
  );

-- PT sessions and embedded exercise plans.
DROP POLICY IF EXISTS pt_session_exercises_delete_assigned_coach ON public.pt_session_exercises;
DROP POLICY IF EXISTS pt_session_exercises_staff_delete ON public.pt_session_exercises;
CREATE POLICY pt_session_exercises_staff_delete ON public.pt_session_exercises
  FOR DELETE TO authenticated
  USING (
    (
      (SELECT public.is_active_user())
      AND (SELECT public.is_admin_or_manager())
    )
    OR EXISTS (
      SELECT 1 FROM public.pt_sessions s
      WHERE s.id=pt_session_exercises.session_id
        AND s.client_id IS NOT NULL
        AND app_private.is_pt_coach_for_member(s.client_id)
    )
  );

DROP POLICY IF EXISTS pt_session_exercises_insert_assigned_coach ON public.pt_session_exercises;
DROP POLICY IF EXISTS pt_session_exercises_staff_insert ON public.pt_session_exercises;
CREATE POLICY pt_session_exercises_staff_insert ON public.pt_session_exercises
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT public.is_active_user())
      AND (SELECT public.is_admin_or_manager())
    )
    OR EXISTS (
      SELECT 1 FROM public.pt_sessions s
      WHERE s.id=pt_session_exercises.session_id
        AND s.client_id IS NOT NULL
        AND app_private.is_pt_coach_for_member(s.client_id)
    )
  );

DROP POLICY IF EXISTS pt_session_exercises_read_assigned_coach ON public.pt_session_exercises;
DROP POLICY IF EXISTS pt_session_exercises_read_combined ON public.pt_session_exercises;
CREATE POLICY pt_session_exercises_read_combined ON public.pt_session_exercises
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND EXISTS (
      SELECT 1 FROM public.pt_sessions s
      WHERE s.id=pt_session_exercises.session_id
        AND (
          (SELECT public.is_admin_or_manager())
          OR s.client_id=(SELECT auth.uid())
          OR s.status='published'
          OR (
            s.client_id IS NOT NULL
            AND app_private.is_pt_coach_for_member(s.client_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS pt_session_exercises_update_assigned_coach ON public.pt_session_exercises;
DROP POLICY IF EXISTS pt_session_exercises_staff_update ON public.pt_session_exercises;
CREATE POLICY pt_session_exercises_staff_update ON public.pt_session_exercises
  FOR UPDATE TO authenticated
  USING (
    (
      (SELECT public.is_active_user())
      AND (SELECT public.is_admin_or_manager())
    )
    OR EXISTS (
      SELECT 1 FROM public.pt_sessions s
      WHERE s.id=pt_session_exercises.session_id
        AND s.client_id IS NOT NULL
        AND app_private.is_pt_coach_for_member(s.client_id)
    )
  )
  WITH CHECK (
    (
      (SELECT public.is_active_user())
      AND (SELECT public.is_admin_or_manager())
    )
    OR EXISTS (
      SELECT 1 FROM public.pt_sessions s
      WHERE s.id=pt_session_exercises.session_id
        AND s.client_id IS NOT NULL
        AND app_private.is_pt_coach_for_member(s.client_id)
    )
  );

DROP POLICY IF EXISTS pt_sessions_insert_assigned_coach ON public.pt_sessions;
DROP POLICY IF EXISTS pt_sessions_staff_insert ON public.pt_sessions;
CREATE POLICY pt_sessions_staff_insert ON public.pt_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT public.is_active_user())
      AND (SELECT public.is_admin_or_manager())
      AND created_by=(SELECT auth.uid())
    )
    OR (
      created_by=(SELECT auth.uid())
      AND client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(client_id)
    )
  );

DROP POLICY IF EXISTS pt_sessions_read_assigned_coach ON public.pt_sessions;
DROP POLICY IF EXISTS pt_sessions_read ON public.pt_sessions;
CREATE POLICY pt_sessions_read ON public.pt_sessions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_active_user())
    AND (
      (SELECT public.is_admin_or_manager())
      OR client_id=(SELECT auth.uid())
      OR status='published'
      OR (
        client_id IS NOT NULL
        AND app_private.is_pt_coach_for_member(client_id)
      )
    )
  );

DROP POLICY IF EXISTS pt_sessions_update_assigned_coach ON public.pt_sessions;
DROP POLICY IF EXISTS pt_sessions_staff_update ON public.pt_sessions;
CREATE POLICY pt_sessions_staff_update ON public.pt_sessions
  FOR UPDATE TO authenticated
  USING (
    (
      (SELECT public.is_active_user())
      AND (SELECT public.is_admin_or_manager())
    )
    OR (
      client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(client_id)
    )
  )
  WITH CHECK (
    (
      (SELECT public.is_active_user())
      AND (SELECT public.is_admin_or_manager())
    )
    OR (
      client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(client_id)
    )
  );

-- PT WOD assignments.
DROP POLICY IF EXISTS pt_wod_assignments_insert_assigned_coach ON public.pt_wod_assignments;
DROP POLICY IF EXISTS pt_wod_assignments_staff_insert ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_staff_insert ON public.pt_wod_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      (SELECT public.is_admin_or_manager())
      AND assigned_by=(SELECT auth.uid())
    )
    OR (
      assigned_by=(SELECT auth.uid())
      AND app_private.is_pt_coach_for_member(member_id)
    )
  );

DROP POLICY IF EXISTS pt_wod_assignments_read_assigned_coach ON public.pt_wod_assignments;
DROP POLICY IF EXISTS pt_wod_assignments_read_own_or_staff ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_read_own_or_staff ON public.pt_wod_assignments
  FOR SELECT TO authenticated
  USING (
    member_id=(SELECT auth.uid())
    OR (SELECT public.is_admin_or_manager())
    OR app_private.is_pt_coach_for_member(member_id)
  );

DROP POLICY IF EXISTS pt_wod_assignments_update_assigned_coach ON public.pt_wod_assignments;
DROP POLICY IF EXISTS pt_wod_assignments_staff_update ON public.pt_wod_assignments;
CREATE POLICY pt_wod_assignments_staff_update ON public.pt_wod_assignments
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR member_id=(SELECT auth.uid())
    OR app_private.is_pt_coach_for_member(member_id)
  )
  WITH CHECK (
    (SELECT public.is_admin_or_manager())
    OR member_id=(SELECT auth.uid())
    OR app_private.is_pt_coach_for_member(member_id)
  );

-- Private PT WOD writes and reads: active PTs can only manage their own unpublished WODs.
DROP POLICY IF EXISTS wods_insert_own_pt_library ON public.wods;
DROP POLICY IF EXISTS wods_staff_insert ON public.wods;
CREATE POLICY wods_staff_insert ON public.wods
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin_or_manager())
    OR (
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
    )
  );

DROP POLICY IF EXISTS wods_update_own_pt_library ON public.wods;
DROP POLICY IF EXISTS wods_staff_update ON public.wods;
CREATE POLICY wods_staff_update ON public.wods
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin_or_manager())
    OR (
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
  )
  WITH CHECK (
    (SELECT public.is_admin_or_manager())
    OR (
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
    )
  );

-- Keep the large existing WOD SELECT predicate intact; the private coach read
-- policy is still an intentional additional visibility path for coach-owned WODs.
