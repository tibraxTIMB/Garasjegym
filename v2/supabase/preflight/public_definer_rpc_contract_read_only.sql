-- Read-only release guard for intentionally exposed SECURITY DEFINER RPCs.
-- The allowlist is exact (name and identity arguments): adding a new direct
-- privileged RPC requires explicit review and updating this contract.
-- This does not establish behavioral security; keep functional/RLS tests.
WITH approved(name,args) AS (VALUES
 ('archive_pt_program','p_program_id uuid'),
 ('archive_pt_program_session','p_session_id uuid'),
 ('book_class','p_class_id uuid'),
 ('book_pt_session','p_session_id uuid'),
 ('cancel_pt_booking','p_booking_id uuid'),
 ('cancel_pt_session','p_session_id uuid, p_note text'),
 ('create_pt_program_with_sessions','p_program jsonb, p_sessions jsonb'),
 ('create_pt_session_from_request','p_request_id uuid, p_starts_at timestamp with time zone, p_session_type text, p_staff_note text'),
 ('get_class_attendance_counts','p_class_ids uuid[]'),
 ('get_infotainment_schedule','p_from timestamp with time zone, p_to timestamp with time zone'),
 ('get_member_workout_leaderboard',''),
 ('get_pt_intake_request_state','p_member_id uuid'),
 ('get_pt_wod_result','p_assignment_id uuid, p_program_session_id uuid'),
 ('send_pt_wod_feedback','p_feedback_text text, p_dosing text, p_assignment_id uuid, p_program_session_id uuid'),
 ('request_pt_intake','p_member_id uuid'),
 ('is_active_user',''),
 ('is_admin',''),
 ('is_admin_or_manager',''),
 ('move_pt_program_session','p_session_id uuid, p_week_no integer, p_day_no integer'),
 ('place_coffee_order','p_items jsonb, p_note text'),
 ('place_coffee_order_v2','p_items jsonb, p_note text, p_request_id uuid'),
 ('record_workout_prs','p_workout_id uuid, p_records jsonb'),
 ('reorder_pt_program_sessions','p_session_id uuid, p_target_session_id uuid'),
 ('restore_pt_program','p_program_id uuid'),
 ('restore_pt_program_session','p_session_id uuid'),
 ('skip_coffee_product_review','p_order_item_id uuid'),
 ('submit_coffee_product_review','p_order_item_id uuid, p_rating integer, p_comment text'),
 ('toggle_social_reaction','p_post_id uuid, p_reaction text'),
 ('update_pt_session_details','p_session_id uuid, p_title text, p_starts_at timestamp with time zone, p_duration_minutes integer, p_message text')
), functions AS (
 SELECT p.proname name, pg_get_function_identity_arguments(p.oid) args,
        has_function_privilege('anon',p.oid,'EXECUTE') anon_exec,
        has_function_privilege('authenticated',p.oid,'EXECUTE') signed_in_exec,
        EXISTS (SELECT 1 FROM pg_trigger t WHERE t.tgfoid=p.oid AND NOT t.tgisinternal) is_trigger,
        lower(pg_get_functiondef(p.oid)) body
 FROM pg_proc p
 WHERE p.pronamespace='public'::regnamespace AND p.prosecdef
), callable AS (
 SELECT * FROM functions WHERE signed_in_exec
), reviewed AS (
 SELECT c.*, a.name IS NOT NULL approved
 FROM callable c LEFT JOIN approved a ON a.name=c.name AND a.args=c.args
), guards AS (
 SELECT name,
        CASE
          WHEN name='place_coffee_order'
            THEN body LIKE '%public.place_coffee_order_v2(%'
          WHEN name IN ('is_active_user','is_admin','is_admin_or_manager')
            THEN body LIKE '%membership_status = ''approved''%' AND body LIKE '%auth.uid()%'
          WHEN name IN ('get_pt_wod_result','send_pt_wod_feedback')
            THEN body LIKE '%auth.uid()%' AND body LIKE '%is_active_user()%'
              AND body LIKE '%is_admin_or_manager()%'
              AND body LIKE '%is_pt_coach_for_member(v_member)%'
              AND body LIKE '%wl.member_id=v_member%'
              AND body LIKE '%wl.source_wod_id=v_wod%'
          ELSE body LIKE '%is_active_user()%'
        END guard_present
 FROM reviewed
)
SELECT
 NOT EXISTS (SELECT 1 FROM functions WHERE anon_exec) AS no_anon_definer_execution,
 NOT EXISTS (SELECT 1 FROM functions WHERE is_trigger AND signed_in_exec) AS no_direct_trigger_execution,
 (SELECT count(*) FROM callable)=(SELECT count(*) FROM approved) AS reviewed_rpc_count,
 NOT EXISTS (SELECT 1 FROM reviewed WHERE NOT approved) AS no_unreviewed_privileged_rpc,
 NOT EXISTS (SELECT 1 FROM approved a WHERE NOT EXISTS (SELECT 1 FROM reviewed r WHERE r.name=a.name AND r.args=a.args)) AS no_missing_approved_rpc,
 COALESCE((SELECT bool_and(guard_present) FROM guards),false) AS all_rpc_guard_markers_present;
