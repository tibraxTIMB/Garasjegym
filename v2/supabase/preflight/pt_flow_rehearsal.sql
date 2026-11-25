\set ON_ERROR_STOP on
\ir pt_flow_fixture.sql
\ir pt_flow_unlock_candidate.sql
create function public.test_assert(ok boolean,msg text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAILED: %',msg;end if;raise notice 'PASS: %',msg;end;$$;
create function public.test_denied(cmd text,needle text) returns void language plpgsql as $$begin
 begin execute cmd; exception when others then
 if position(needle in SQLERRM)=0 then raise exception 'Unexpected error: %',SQLERRM;end if;
 raise notice 'PASS: rejected %',needle;return;end;
 raise exception 'FAILED: statement unexpectedly succeeded';
end;$$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.test_assert(public.pt_flow_can_start('20000000-0000-4000-8000-000000000001') and public.pt_flow_can_start('20000000-0000-4000-8000-000000000002'),'existing plan defaults to open');
select public.test_assert((select flow_unlock_mode='open' from public.pt_programs where id='10000000-0000-4000-8000-000000000001'),'legacy default preserved');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
update public.pt_programs set flow_unlock_mode='sequence' where id='10000000-0000-4000-8000-000000000001';
update public.pt_program_sessions set flow_requires_approval=true where id='20000000-0000-4000-8000-000000000001';
select public.test_assert(public.pt_flow_can_start('20000000-0000-4000-8000-000000000001') and not public.pt_flow_can_start('20000000-0000-4000-8000-000000000002'),'coach sees sequence');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
select public.test_assert(not public.pt_flow_can_start('20000000-0000-4000-8000-000000000001'),'unrelated member cannot access');
select public.test_assert((select count(*)=0 from public.pt_program_sessions),'unrelated member RLS');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.test_denied($q$update public.pt_program_sessions set flow_override=true,status='in_progress' where id='20000000-0000-4000-8000-000000000002'$q$,'Berre ansvarleg PT');
select public.test_denied($q$update public.pt_program_sessions set status='in_progress' where id='20000000-0000-4000-8000-000000000002'$q$,'PT-økta er låst');
select public.test_denied($q$select public.save_workout_with_pt_links('{"id":"40000000-0000-4000-8000-000000000002","source_wod_id":"30000000-0000-4000-8000-000000000001"}',null,'20000000-0000-4000-8000-000000000002')$q$,'PT-økta er låst');
select public.test_assert((select count(*)=0 from public.workout_logs),'blocked save rolls back log');
select public.save_workout_with_pt_links('{"id":"40000000-0000-4000-8000-000000000001","source_wod_id":"30000000-0000-4000-8000-000000000001"}',null,'20000000-0000-4000-8000-000000000001');
select public.test_assert(not public.pt_flow_can_start('20000000-0000-4000-8000-000000000002'),'saved session waits for approval');
select public.test_denied($q$select public.save_workout_with_pt_links('{"id":"40000000-0000-4000-8000-000000000001","source_wod_id":"30000000-0000-4000-8000-000000000001"}','50000000-0000-4000-8000-000000000001',null)$q$,'allereie');
select public.test_assert((select status='assigned' from public.pt_wod_assignments where id='50000000-0000-4000-8000-000000000001'),'standalone assignment untouched');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
update public.pt_program_sessions set flow_approved=true where id='20000000-0000-4000-8000-000000000001';
select public.test_assert(public.pt_flow_can_start('20000000-0000-4000-8000-000000000002'),'approval unlocks next');
update public.pt_programs set flow_unlock_mode='date' where id='10000000-0000-4000-8000-000000000001';
select public.test_assert(not public.pt_flow_can_start('20000000-0000-4000-8000-000000000002'),'missing date stays locked');
update public.pt_program_sessions set scheduled_date=(now() at time zone 'Europe/Oslo')::date+1 where id='20000000-0000-4000-8000-000000000002';
select public.test_assert(not public.pt_flow_can_start('20000000-0000-4000-8000-000000000002'),'tomorrow locked');
update public.pt_program_sessions set flow_override=true where id='20000000-0000-4000-8000-000000000002';
select public.test_assert(public.pt_flow_can_start('20000000-0000-4000-8000-000000000002'),'manual override opens');
update public.pt_program_sessions set flow_override=false,scheduled_date=(now() at time zone 'Europe/Oslo')::date where id='20000000-0000-4000-8000-000000000002';
select public.test_assert(public.pt_flow_can_start('20000000-0000-4000-8000-000000000002'),'today opens');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select public.save_workout_with_pt_links('{"id":"40000000-0000-4000-8000-000000000002","source_wod_id":"30000000-0000-4000-8000-000000000001"}',null,'20000000-0000-4000-8000-000000000002');
select public.save_workout_with_pt_links('{"id":"40000000-0000-4000-8000-000000000002","source_wod_id":"30000000-0000-4000-8000-000000000001"}',null,'20000000-0000-4000-8000-000000000002');
select public.test_assert((select count(*)=2 from public.workout_logs),'same WOD twice and retry retains two logs');
select public.test_assert((select count(distinct workout_log_id)=2 from public.pt_program_sessions where program_id='10000000-0000-4000-8000-000000000001'),'distinct plan session IDs');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
select public.test_denied($q$select public.create_pt_flow_program_with_sessions('{"client_id":"00000000-0000-4000-8000-000000000003","title":"Forbidden"}','[{"title":"A"}]','sequence',true)$q$,'berre oppretta');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
select public.create_pt_flow_program_with_sessions('{"client_id":"00000000-0000-4000-8000-000000000003","title":"Date plan","start_date":"2026-12-01"}','[{"title":"A","week_no":1,"day_no":1},{"title":"B","week_no":2,"day_no":2}]','date',false) as newplan \gset
select public.test_assert((select flow_unlock_mode='date' from public.pt_programs where id=:'newplan'),'atomic create mode');
select public.test_assert((select count(*)=2 from public.pt_program_sessions where program_id=:'newplan' and scheduled_date in ('2026-12-01','2026-12-09')),'atomic schedule generated');
reset role;
set role anon;
select public.test_assert(not has_function_privilege('anon','public.pt_flow_can_start(uuid)','execute'),'anon cannot call start RPC');
reset role;
