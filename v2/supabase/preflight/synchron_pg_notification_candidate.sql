-- Candidate only: isolated PostgreSQL fixture, not a migration.
-- Deliver existing validated private outbox to existing in-app notification center.
-- A collision or notification failure aborts the entire create transaction.
CREATE FUNCTION gg_synchron_private.deliver_invitation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $invite$
DECLARE s jsonb; link text; key text;
BEGIN
 SELECT state INTO s FROM gg_synchron_private.sessions WHERE id=NEW.session_id;
 IF NOT FOUND OR s->>'phase' IS DISTINCT FROM 'ready'
 OR NOT gg_synchron_private.eligible((s#>>'{plan,leaderId}')::uuid,NEW.recipient)
 OR NOT coalesce((s#>'{plan,members}') ? NEW.recipient::text,false)
 OR NEW.payload->>'recipientId' IS DISTINCT FROM NEW.recipient::text
 OR NEW.payload->>'sessionId' IS DISTINCT FROM NEW.session_id::text
 THEN RAISE EXCEPTION 'Invalid Synchron notification'; END IF;
 link:='synchron-session:'||NEW.session_id::text;
 key:='synchron-invite:'||NEW.session_id::text;
 IF NEW.payload->>'href' IS DISTINCT FROM link THEN RAISE EXCEPTION 'Invalid Synchron link'; END IF;
 -- The recipient must still join through the authenticated session gateway.
 -- A read or dismissed notification is never proof of attendance.
 INSERT INTO public.notifications(recipient_id,title,body,category,href,priority,requires_ack,requires_action,status,dedupe_key)
 VALUES(NEW.recipient,'Delta i fellesøkta','PT har gjort klar ei fellesøkt. Opna varselet for å sjå økta og delta.','pt',link,'normal',false,false,'open',key);
 RETURN NEW;
END $invite$;
REVOKE ALL ON FUNCTION gg_synchron_private.deliver_invitation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER synchron_deliver_invitation AFTER INSERT ON gg_synchron_private.outbox
FOR EACH ROW EXECUTE FUNCTION gg_synchron_private.deliver_invitation();
