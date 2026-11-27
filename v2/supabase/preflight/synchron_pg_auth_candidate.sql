-- Candidate only; run in disposable PostgreSQL fixture, not production.
-- Narrow boolean lookup; do not grant the backend access to raw Auth sessions.
-- Must be owned by a trusted Auth-readable migration role, not the server role.
CREATE FUNCTION gg_synchron_private.session_active(a uuid,sid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $session$
 SELECT EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id=sid AND s.user_id=a AND (s.not_after IS NULL OR s.not_after>statement_timestamp()))
$session$;
REVOKE ALL ON FUNCTION gg_synchron_private.session_active(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION gg_synchron_private.session_active(uuid,uuid) TO gg_synchron_server;
