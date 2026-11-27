-- CANDIDATE ONLY: run solely in disposable PostgreSQL rehearsal.
-- No production migration, Data API exposure or grants to browser roles.
CREATE SCHEMA gg_synchron_private;
REVOKE ALL ON SCHEMA gg_synchron_private FROM PUBLIC, anon, authenticated;
CREATE TABLE gg_synchron_private.sessions(
 id uuid PRIMARY KEY, leader uuid NOT NULL, fingerprint text NOT NULL,
 revision bigint NOT NULL CHECK(revision>=0), state jsonb NOT NULL,
 CHECK(state#>>'{plan,id}'=id::text AND state#>>'{plan,leaderId}'=leader::text AND (state->>'revision')::bigint=revision)
);
CREATE TABLE gg_synchron_private.slots(
 actor uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES gg_synchron_private.sessions(id)
);
CREATE TABLE gg_synchron_private.outbox(
 session_id uuid REFERENCES gg_synchron_private.sessions(id), recipient uuid,
 payload jsonb NOT NULL, PRIMARY KEY(session_id,recipient)
);
ALTER TABLE gg_synchron_private.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gg_synchron_private.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gg_synchron_private.outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA gg_synchron_private FROM PUBLIC,anon,authenticated;

CREATE FUNCTION gg_synchron_private.active_account(a uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=a AND p.active=true AND p.membership_status='approved')
$$;
CREATE FUNCTION gg_synchron_private.coach(a uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT gg_synchron_private.active_account(a) AND EXISTS(SELECT 1 FROM public.pt_coaches c WHERE c.user_id=a AND c.is_active=true)
$$;
CREATE FUNCTION gg_synchron_private.eligible(a uuid,b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT gg_synchron_private.coach(a) AND gg_synchron_private.active_account(b)
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=b AND p.role='member')
 AND EXISTS(SELECT 1 FROM public.pt_client_assignments x WHERE x.coach_user_id=a AND x.member_id=b AND x.status='active')
$$;
CREATE FUNCTION gg_synchron_private.authorized(a uuid,s jsonb) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT COALESCE(gg_synchron_private.coach((s#>>'{plan,leaderId}')::uuid)
 AND gg_synchron_private.active_account(a)
 AND (a::text=s#>>'{plan,leaderId}' OR
 (s#>'{plan,members}' ? a::text AND gg_synchron_private.eligible((s#>>'{plan,leaderId}')::uuid,a))),false)
$$;
-- Lock all relevant permission rows until transaction commit; an update or
-- removal of membership/assignment cannot interleave with accepted mutation.
CREATE FUNCTION gg_synchron_private.lock_permissions(s jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE l uuid:=(s#>>'{plan,leaderId}')::uuid;
BEGIN
 PERFORM p.id FROM public.profiles p
 WHERE p.id=l OR p.id::text IN (SELECT jsonb_array_elements_text(s#>'{plan,members}'))
 ORDER BY p.id FOR SHARE;
 PERFORM c.user_id FROM public.pt_coaches c WHERE c.user_id=l FOR SHARE;
 PERFORM x.member_id FROM public.pt_client_assignments x WHERE x.coach_user_id=l
 AND x.member_id::text IN (SELECT jsonb_array_elements_text(s#>'{plan,members}'))
 ORDER BY x.member_id FOR SHARE;
END $$;
CREATE FUNCTION gg_synchron_private.create_atomic(a uuid,record jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE s jsonb:=record->'state'; sid uuid:=(s#>>'{plan,id}')::uuid;
 l uuid:=(s#>>'{plan,leaderId}')::uuid; member text; invite jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('gg-synchron-private-v1',0));
 IF s IS NULL OR a IS DISTINCT FROM l OR record->>'actorId' IS DISTINCT FROM a::text
 OR s->>'phase' IS DISTINCT FROM 'ready' OR s->>'revision' IS DISTINCT FROM '0'
 OR s->'joined' IS DISTINCT FROM '[]'::jsonb OR jsonb_typeof(s#>'{plan,members}') IS DISTINCT FROM 'array'
 OR jsonb_array_length(s#>'{plan,members}') NOT BETWEEN 2 AND 8 THEN RETURN false; END IF;
 PERFORM gg_synchron_private.lock_permissions(s);
 IF NOT gg_synchron_private.coach(a) OR EXISTS(SELECT 1 FROM gg_synchron_private.sessions WHERE id=sid)
 OR EXISTS(SELECT 1 FROM gg_synchron_private.slots WHERE actor=a) THEN RETURN false; END IF;
 PERFORM w.id FROM public.wods w WHERE w.id::text=s#>>'{plan,sourceWodId}' AND w.is_published=true AND NOT coalesce(w.is_archived,false) FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 FOR member IN SELECT jsonb_array_elements_text(s#>'{plan,members}') LOOP
  IF member<>l::text AND (NOT gg_synchron_private.eligible(l,member::uuid) OR EXISTS(SELECT 1 FROM gg_synchron_private.slots WHERE actor=member::uuid)) THEN RETURN false; END IF;
 END LOOP;
 IF jsonb_typeof(record->'invitations') IS DISTINCT FROM 'array' OR
 (SELECT count(DISTINCT x) FROM jsonb_array_elements_text(s#>'{plan,members}') x)<>jsonb_array_length(s#>'{plan,members}') OR
 jsonb_array_length(record->'invitations')<>(SELECT count(*) FROM jsonb_array_elements_text(s#>'{plan,members}') x WHERE x<>l::text)
 THEN RETURN false; END IF;
 INSERT INTO gg_synchron_private.sessions VALUES(sid,l,record->>'fingerprint',0,s);
 INSERT INTO gg_synchron_private.slots VALUES(l,sid);
 FOR invite IN SELECT jsonb_array_elements(record->'invitations') LOOP
  IF invite->>'sessionId' IS DISTINCT FROM sid::text OR invite->>'href' IS DISTINCT FROM ('synchron-session:'||sid::text)
  OR invite->>'recipientId'=l::text OR NOT (s#>'{plan,members}' ? (invite->>'recipientId')) THEN RAISE EXCEPTION 'Invalid invitation'; END IF;
  INSERT INTO gg_synchron_private.outbox VALUES(sid,(invite->>'recipientId')::uuid,invite);
 END LOOP;
 RETURN true;
EXCEPTION WHEN unique_violation OR check_violation OR not_null_violation THEN RETURN false;
END $$;
CREATE FUNCTION gg_synchron_private.cas(a uuid,sid uuid,expected bigint,next_state jsonb) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE old_state jsonb; old_revision bigint; member text; occupied uuid[];
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('gg-synchron-private-v1',0));
 SELECT s.state,s.revision INTO old_state,old_revision FROM gg_synchron_private.sessions s WHERE s.id=sid FOR UPDATE;
 IF NOT FOUND OR old_revision IS DISTINCT FROM expected OR next_state#>'{plan}' IS DISTINCT FROM old_state#>'{plan}'
 OR (next_state->>'revision')::bigint IS DISTINCT FROM expected+1
 OR next_state->>'phase' NOT IN ('ready','countdown','running','paused','finished')
 OR jsonb_typeof(next_state->'joined') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 PERFORM gg_synchron_private.lock_permissions(old_state);
 IF NOT gg_synchron_private.authorized(a,old_state) THEN RETURN false; END IF;
 FOR member IN SELECT jsonb_array_elements_text(next_state->'joined') LOOP
  IF NOT (old_state#>'{plan,members}' ? member) THEN RETURN false; END IF;
 END LOOP;
 IF next_state->>'phase'='finished' THEN occupied:=ARRAY[]::uuid[];
 ELSE SELECT array_agg(DISTINCT x::uuid) INTO occupied FROM (
  SELECT next_state#>>'{plan,leaderId}' AS x UNION SELECT jsonb_array_elements_text(next_state->'joined')
 ) q; END IF;
 IF EXISTS(SELECT 1 FROM unnest(occupied) x WHERE NOT gg_synchron_private.authorized(x,next_state))
 OR EXISTS(SELECT 1 FROM gg_synchron_private.slots p WHERE p.actor=ANY(occupied) AND p.session_id<>sid) THEN RETURN false; END IF;
 UPDATE gg_synchron_private.sessions SET revision=expected+1,state=next_state WHERE id=sid AND revision=expected;
 IF NOT FOUND THEN RETURN false; END IF;
 DELETE FROM gg_synchron_private.slots WHERE session_id=sid;
 INSERT INTO gg_synchron_private.slots SELECT x,sid FROM unnest(occupied) x;
 RETURN true;
EXCEPTION WHEN unique_violation OR check_violation OR not_null_violation THEN RETURN false;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA gg_synchron_private FROM PUBLIC,anon,authenticated;
