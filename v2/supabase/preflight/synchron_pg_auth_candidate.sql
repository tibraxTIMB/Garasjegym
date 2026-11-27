-- Candidate only; run in disposable PostgreSQL fixture, not production.
-- Narrow boolean lookup; do not grant the backend access to raw Auth sessions.
-- Must be owned by a trusted Auth-readable migration role, not the server role.
CREATE FUNCTION gg_synchron_private.session_active(a uuid,sid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $session$
 SELECT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=sid AND s.user_id=a AND (s.not_after IS NULL OR s.not_after>statement_timestamp()))
$session$;
REVOKE ALL ON FUNCTION gg_synchron_private.session_active(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION gg_synchron_private.session_active(uuid,uuid) TO gg_synchron_server;

-- The trusted host must call this in the same transaction as each protected
-- query. A concurrent session DELETE/UPDATE must wait for this row lock.
CREATE FUNCTION gg_synchron_private.require_active_session(a uuid,sid uuid) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog AS $lock$
BEGIN
 PERFORM 1 FROM auth.sessions s
 WHERE s.id=sid AND s.user_id=a AND (s.not_after IS NULL OR s.not_after>clock_timestamp())
 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Session unavailable' USING ERRCODE='28000'; END IF;
END $lock$;
REVOKE ALL ON FUNCTION gg_synchron_private.require_active_session(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION gg_synchron_private.require_active_session(uuid,uuid) TO gg_synchron_server;
