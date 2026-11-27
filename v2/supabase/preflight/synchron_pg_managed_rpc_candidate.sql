-- REVIEW CANDIDATE: a fixed service-only RPC, never arbitrary SQL.
-- The HTTP server verifies the bearer, then this bridge independently locks
-- the verified Auth session within every database operation.
CREATE FUNCTION gg_synchron_private.edge_query(p_request jsonb) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $bridge$
DECLARE
 a uuid; auth_sid uuid; target uuid; rev bigint; payload jsonb;
 op text; result jsonb;
BEGIN
 IF jsonb_typeof(p_request) IS DISTINCT FROM 'object'
    OR (p_request - ARRAY['actor','session','op','id','revision','payload']) <> '{}'::jsonb
 THEN RAISE EXCEPTION 'Invalid server request' USING ERRCODE='22023'; END IF;
 a := (p_request->>'actor')::uuid;
 auth_sid := (p_request->>'session')::uuid;
 target := (p_request->>'id')::uuid;
 rev := (p_request->>'revision')::bigint;
 payload := p_request->'payload';
 op := p_request->>'op';
 IF a IS NULL OR auth_sid IS NULL THEN RAISE EXCEPTION 'Missing identity' USING ERRCODE='28000'; END IF;
 IF op='session_active' THEN RETURN to_jsonb(gg_synchron_private.session_active(a,auth_sid)); END IF;
 PERFORM gg_synchron_private.require_active_session(a,auth_sid);
 CASE op
 WHEN 'coach_context' THEN
  SELECT jsonb_build_object('canCoach',gg_synchron_private.coach(a),'eligibleMemberIds',coalesce((SELECT jsonb_agg(member_id) FROM public.pt_client_assignments WHERE coach_user_id=a AND gg_synchron_private.eligible(a,member_id)),'[]'::jsonb)) INTO result;
 WHEN 'read_wod' THEN
  SELECT to_jsonb(w) INTO result FROM public.wods w WHERE id=target AND is_published AND NOT coalesce(is_archived,false) AND gg_synchron_private.coach(a);
 WHEN 'read_creation' THEN
  SELECT jsonb_build_object('actorId',leader,'fingerprint',fingerprint) INTO result FROM gg_synchron_private.sessions WHERE id=target AND leader=a AND gg_synchron_private.coach(a);
 WHEN 'create_atomic' THEN
  IF jsonb_typeof(payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid payload'; END IF;
  result := to_jsonb(gg_synchron_private.create_atomic(a,payload));
 WHEN 'read_state' THEN
  SELECT state INTO result FROM gg_synchron_private.sessions WHERE id=target AND gg_synchron_private.authorized(a,state);
 WHEN 'authorize' THEN
  SELECT to_jsonb(coalesce((SELECT gg_synchron_private.authorized(a,state) FROM gg_synchron_private.sessions WHERE id=target),false)) INTO result;
 WHEN 'cas' THEN
  IF rev IS NULL OR rev<0 OR jsonb_typeof(payload) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid revision or payload'; END IF;
  result := to_jsonb(gg_synchron_private.cas(a,target,rev,payload));
 WHEN 'active_account' THEN result := to_jsonb(gg_synchron_private.active_account(a));
 WHEN 'read_active_session' THEN
  SELECT to_jsonb(session_id::text) INTO result FROM gg_synchron_private.slots WHERE actor=a;
 WHEN 'save_own_result' THEN result := gg_synchron_private.save_own_result(a,target);
 ELSE RAISE EXCEPTION 'Unsupported server operation' USING ERRCODE='22023';
 END CASE;
 RETURN result;
END $bridge$;
REVOKE ALL ON FUNCTION gg_synchron_private.edge_query(jsonb) FROM PUBLIC,anon,authenticated,service_role;
-- Temporary ownership transfer only; preserve any pre-existing SET grant.
DO $owner$
DECLARE added_set boolean := NOT pg_has_role(current_user,'gg_synchron_server','SET');
DECLARE added_create boolean := NOT has_schema_privilege('gg_synchron_server','gg_synchron_private','CREATE');
BEGIN
 IF added_set THEN
  EXECUTE format('GRANT gg_synchron_server TO %I WITH SET TRUE, INHERIT FALSE GRANTED BY %I',current_user,current_user);
 END IF;
 IF added_create THEN GRANT CREATE ON SCHEMA gg_synchron_private TO gg_synchron_server; END IF;
 ALTER FUNCTION gg_synchron_private.edge_query(jsonb) OWNER TO gg_synchron_server;
 IF added_create THEN REVOKE CREATE ON SCHEMA gg_synchron_private FROM gg_synchron_server; END IF;
 IF added_set THEN
  EXECUTE format('REVOKE gg_synchron_server FROM %I GRANTED BY %I',current_user,current_user);
 END IF;
END $owner$;
-- This public entry is SECURITY INVOKER. Only the existing server secret
-- may call it; browser roles cannot access either the wrapper or private schema.
GRANT USAGE ON SCHEMA gg_synchron_private TO service_role;
GRANT EXECUTE ON FUNCTION gg_synchron_private.edge_query(jsonb) TO service_role;
CREATE FUNCTION public.gg_synchron_edge_query(p_request jsonb) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $wrapper$
 SELECT gg_synchron_private.edge_query(p_request)
$wrapper$;
REVOKE ALL ON FUNCTION public.gg_synchron_edge_query(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.gg_synchron_edge_query(jsonb) TO service_role;
