-- CANDIDATE ONLY. Disposable rehearsal, not a production migration.
-- A trusted backend must authenticate actor and use parameterized SQL.
-- No login, role membership, public/browser access, or bypass of RLS.
CREATE ROLE gg_synchron_server NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT USAGE ON SCHEMA public,gg_synchron_private TO gg_synchron_server;
GRANT SELECT,INSERT ON gg_synchron_private.sessions TO gg_synchron_server;
GRANT UPDATE(revision,state) ON gg_synchron_private.sessions TO gg_synchron_server;
GRANT SELECT,INSERT,DELETE ON gg_synchron_private.slots TO gg_synchron_server;
GRANT SELECT,INSERT ON gg_synchron_private.outbox TO gg_synchron_server;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA gg_synchron_private TO gg_synchron_server;
CREATE POLICY synchron_server_session_select ON gg_synchron_private.sessions FOR SELECT TO gg_synchron_server USING (true);
CREATE POLICY synchron_server_session_insert ON gg_synchron_private.sessions FOR INSERT TO gg_synchron_server WITH CHECK (true);
CREATE POLICY synchron_server_session_update ON gg_synchron_private.sessions FOR UPDATE TO gg_synchron_server USING (true) WITH CHECK (true);
CREATE POLICY synchron_server_slots ON gg_synchron_private.slots FOR ALL TO gg_synchron_server USING (true) WITH CHECK (true);
CREATE POLICY synchron_server_outbox_select ON gg_synchron_private.outbox FOR SELECT TO gg_synchron_server USING (true);
CREATE POLICY synchron_server_outbox_insert ON gg_synchron_private.outbox FOR INSERT TO gg_synchron_server WITH CHECK (true);

-- Only columns required for authorization; no profile email or coach notes.
GRANT SELECT(id,active,membership_status,role),UPDATE(id) ON public.profiles TO gg_synchron_server;
GRANT SELECT(user_id,is_active),UPDATE(user_id) ON public.pt_coaches TO gg_synchron_server;
GRANT SELECT(coach_user_id,member_id,status),UPDATE(member_id) ON public.pt_client_assignments TO gg_synchron_server;
-- Existing host reads a published WOD as a JSON record.
GRANT SELECT,UPDATE(id) ON public.wods TO gg_synchron_server;
CREATE POLICY synchron_server_profile_read ON public.profiles FOR SELECT TO gg_synchron_server USING (true);
CREATE POLICY synchron_server_coach_read ON public.pt_coaches FOR SELECT TO gg_synchron_server USING (true);
CREATE POLICY synchron_server_assignment_read ON public.pt_client_assignments FOR SELECT TO gg_synchron_server USING (true);
CREATE POLICY synchron_server_wod_read ON public.wods FOR SELECT TO gg_synchron_server USING (is_published AND NOT coalesce(is_archived,false));
CREATE POLICY synchron_server_wod_read_guard ON public.wods AS RESTRICTIVE FOR SELECT TO gg_synchron_server USING (is_published AND NOT coalesce(is_archived,false));

-- PostgreSQL requires UPDATE privilege for SELECT FOR SHARE.
-- A permissive visibility policy enables locks, while a restrictive check
-- rejects every actual UPDATE (even if a PUBLIC policy grants updates).
DO $locks$
DECLARE tbl text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY['profiles','pt_coaches','pt_client_assignments','wods','workout_logs'] LOOP
  EXECUTE format('CREATE POLICY synchron_server_lock ON public.%I FOR UPDATE TO gg_synchron_server USING (true) WITH CHECK (false)',tbl);
  EXECUTE format('CREATE POLICY synchron_server_no_update ON public.%I AS RESTRICTIVE FOR UPDATE TO gg_synchron_server USING (true) WITH CHECK (false)',tbl);
 END LOOP;
END $locks$;

-- Result writer may only create/read sealed team-result headers, never measured
-- sets, personal scores, arbitrary log edits or deletions.
GRANT SELECT,UPDATE(id) ON public.workout_logs TO gg_synchron_server;
GRANT INSERT(member_id,save_token,title,workout_date,format,rounds,note,result_data) ON public.workout_logs TO gg_synchron_server;
CREATE POLICY synchron_server_result_read ON public.workout_logs FOR SELECT TO gg_synchron_server
 USING (result_data#>>'{participation_verified}'='team' AND result_data#>'{synchron_result,pr_eligible}'='false'::jsonb);
CREATE POLICY synchron_server_result_read_guard ON public.workout_logs AS RESTRICTIVE FOR SELECT TO gg_synchron_server
 USING (result_data#>>'{participation_verified}'='team' AND result_data#>'{synchron_result,pr_eligible}'='false'::jsonb);
CREATE POLICY synchron_server_result_insert ON public.workout_logs FOR INSERT TO gg_synchron_server WITH CHECK (
 save_token IS NOT NULL AND format='Chipper' AND rounds=1 AND source_wod_id IS NULL AND class_live_session_id IS NULL
 AND score_rounds IS NULL AND score_reps IS NULL AND score_time_seconds IS NULL AND score_load_kg IS NULL
 AND score_calories IS NULL AND score_distance IS NULL AND score_unit IS NULL
 AND result_data#>>'{participation_verified}'='team' AND result_data#>'{synchron_result,approved}'='true'::jsonb
 AND result_data#>'{synchron_result,pr_eligible}'='false'::jsonb
 AND EXISTS(SELECT 1 FROM gg_synchron_private.sessions s,
 LATERAL jsonb_array_elements(s.state#>'{seal,entries}') e
 WHERE s.id::text=result_data#>>'{synchron_result,session_id}'
 AND s.state->>'phase'='finished' AND e->>'memberId'=member_id::text
 AND e->>'saveToken'=save_token::text AND e#>'{payload,result_data}'=result_data
 AND e#>>'{payload,title}'=title AND e#>>'{payload,workout_date}'=workout_date::text
 AND e#>>'{payload,note}'=note)
);
-- Restrict even if a pre-existing PUBLIC insert policy is permissive.
CREATE POLICY synchron_server_result_insert_guard ON public.workout_logs AS RESTRICTIVE FOR INSERT TO gg_synchron_server WITH CHECK (
 save_token IS NOT NULL AND format='Chipper' AND rounds=1 AND source_wod_id IS NULL AND class_live_session_id IS NULL
 AND score_rounds IS NULL AND score_reps IS NULL AND score_time_seconds IS NULL AND score_load_kg IS NULL
 AND score_calories IS NULL AND score_distance IS NULL AND score_unit IS NULL
 AND result_data#>>'{participation_verified}'='team' AND result_data#>'{synchron_result,approved}'='true'::jsonb
 AND result_data#>'{synchron_result,pr_eligible}'='false'::jsonb
 AND EXISTS(SELECT 1 FROM gg_synchron_private.sessions s,
 LATERAL jsonb_array_elements(s.state#>'{seal,entries}') e
 WHERE s.id::text=result_data#>>'{synchron_result,session_id}'
 AND s.state->>'phase'='finished' AND e->>'memberId'=member_id::text
 AND e->>'saveToken'=save_token::text AND e#>'{payload,result_data}'=result_data
 AND e#>>'{payload,title}'=title AND e#>>'{payload,workout_date}'=workout_date::text
 AND e#>>'{payload,note}'=note)
);
GRANT INSERT(recipient_id,title,body,category,href,priority,requires_ack,requires_action,status,dedupe_key) ON public.notifications TO gg_synchron_server;
CREATE POLICY synchron_server_notification_insert ON public.notifications FOR INSERT TO gg_synchron_server WITH CHECK (
 title='Delta i fellesøkta' AND body='PT har gjort klar ei fellesøkt. Opna varselet for å sjå økta og delta.'
 AND category='pt' AND priority='normal' AND NOT requires_ack AND NOT requires_action AND status='open' AND NOT is_read
 AND EXISTS(SELECT 1 FROM gg_synchron_private.outbox o WHERE o.recipient=recipient_id
 AND href='synchron-session:'||o.session_id::text AND dedupe_key='synchron-invite:'||o.session_id::text)
);
CREATE POLICY synchron_server_notification_insert_guard ON public.notifications AS RESTRICTIVE FOR INSERT TO gg_synchron_server WITH CHECK (
 title='Delta i fellesøkta' AND body='PT har gjort klar ei fellesøkt. Opna varselet for å sjå økta og delta.'
 AND category='pt' AND priority='normal' AND NOT requires_ack AND NOT requires_action AND status='open' AND NOT is_read
 AND EXISTS(SELECT 1 FROM gg_synchron_private.outbox o WHERE o.recipient=recipient_id
 AND href='synchron-session:'||o.session_id::text AND dedupe_key='synchron-invite:'||o.session_id::text)
);
