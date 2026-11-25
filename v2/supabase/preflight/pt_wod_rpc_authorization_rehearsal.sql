-- CI-only. Synthetic records and role impersonation in a rollback transaction.
-- Never run this fixture on the live database.
BEGIN;
DO $fixture$
DECLARE
 u uuid;
 n int:=0;
 admin_id uuid:='f2000000-0000-4000-8000-000000000001';
 coach_id uuid:='f2000000-0000-4000-8000-000000000002';
 client_id uuid:='f2000000-0000-4000-8000-000000000003';
 outsider_id uuid:='f2000000-0000-4000-8000-000000000004';
 pending_id uuid:='f2000000-0000-4000-8000-000000000005';
 wod_id uuid;
 log_id uuid;
 assignment_id uuid:='f2000000-0000-4000-8000-000000000010';
BEGIN
 FOREACH u IN ARRAY ARRAY[admin_id,coach_id,client_id,outsider_id,pending_id] LOOP
  n:=n+1;
  INSERT INTO auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  VALUES(u,'authenticated','authenticated','pt-rpc-ci-'||n||'@example.invalid','',now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"display_name":"PT RPC CI"}'::jsonb,now(),now());
  IF u<>pending_id THEN
   UPDATE public.profiles SET role=CASE WHEN u=admin_id THEN 'admin' ELSE 'member' END,active=true,membership_status='approved' WHERE id=u;
  END IF;
 END LOOP;
 PERFORM set_config('request.jwt.claim.sub',admin_id::text,true);
 PERFORM set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true);
 INSERT INTO public.pt_coaches(user_id,created_by) VALUES(coach_id,admin_id);
 INSERT INTO public.pt_client_assignments(member_id,coach_user_id,assigned_by) VALUES(client_id,coach_id,admin_id);
 INSERT INTO public.wods(name,format,duration_minutes,movements,notes,audience,is_published,created_by)
 VALUES('CI PT RPC authorization','AMRAP',5,'Air squat','','Alle medlemmar',true,admin_id) RETURNING id INTO wod_id;
 INSERT INTO public.workout_logs(member_id,source_wod_id,title,format,score_rounds,note)
 VALUES(client_id,wod_id,'CI private log','AMRAP',3,'PRIVATE CI NOTE') RETURNING id INTO log_id;
 INSERT INTO public.pt_wod_assignments(id,member_id,wod_id,assigned_by,location,coach_note,status,workout_log_id)
 VALUES(assignment_id,client_id,wod_id,admin_id,'Valfritt','CI','completed',log_id);
END;
$fixture$;
SET LOCAL ROLE authenticated;
DO $authorization$
DECLARE
 u uuid;
 n int:=0;
 assignment_id uuid:='f2000000-0000-4000-8000-000000000010';
 result jsonb;
 feedback uuid;
BEGIN
 FOREACH u IN ARRAY ARRAY[
 'f2000000-0000-4000-8000-000000000001'::uuid,
 'f2000000-0000-4000-8000-000000000002'::uuid,
 'f2000000-0000-4000-8000-000000000003'::uuid,
 'f2000000-0000-4000-8000-000000000004'::uuid,
 'f2000000-0000-4000-8000-000000000005'::uuid] LOOP
  n:=n+1;
  PERFORM set_config('request.jwt.claim.sub',u::text,true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  IF n<=3 THEN
   result:=public.get_pt_wod_result(assignment_id,NULL);
   IF result IS NULL OR result->>'score_rounds' IS DISTINCT FROM '3' OR result::text LIKE '%PRIVATE CI NOTE%' THEN
    RAISE EXCEPTION 'PT result read or privacy failed for actor %',n;
   END IF;
  ELSE
   BEGIN
    PERFORM public.get_pt_wod_result(assignment_id,NULL);
    RAISE EXCEPTION 'Unauthorized PT result read for actor %',n;
   EXCEPTION WHEN insufficient_privilege THEN NULL;
   END;
  END IF;
  IF n<=2 THEN
   feedback:=public.send_pt_wod_feedback('CI controlled feedback','appropriate',assignment_id,NULL);
   IF feedback IS NULL THEN RAISE EXCEPTION 'Allowed feedback failed for actor %',n; END IF;
  ELSE
   BEGIN
    PERFORM public.send_pt_wod_feedback('CI unauthorized feedback','appropriate',assignment_id,NULL);
    RAISE EXCEPTION 'Unauthorized PT feedback for actor %',n;
   EXCEPTION WHEN insufficient_privilege THEN NULL;
   END;
  END IF;
 END LOOP;
END;
$authorization$;
RESET ROLE;
DO $verify$
BEGIN
 IF (SELECT count(*) FROM public.pt_wod_feedback WHERE assignment_id='f2000000-0000-4000-8000-000000000010')<>2 THEN
  RAISE EXCEPTION 'Expected exactly two authorized feedback rows';
 END IF;
END;
$verify$;
ROLLBACK;
