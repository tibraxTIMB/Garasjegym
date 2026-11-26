\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into public.garage_equipment_inventory(equipment_key,equipment_label,available) values ('romaskin','Romaskin',1);
update public.garage_equipment_inventory set available=2 where equipment_key='romaskin';
do $$begin
 if (select available from public.garage_equipment_inventory where equipment_key='romaskin')<>2 then raise exception 'staff write'; end if;
 if public.get_pt_wod_result('30000000-0000-0000-0000-000000000001',null)->'result_data'->>'participation_verified' is distinct from 'individual' then raise exception 'individual provenance';end if;
 if public.get_pt_wod_result('30000000-0000-0000-0000-000000000002',null)->'result_data'->>'participation_verified' is distinct from 'team' then raise exception 'team provenance';end if;
 if public.get_pt_wod_result('30000000-0000-0000-0000-000000000003',null)->'result_data'->>'participation_verified' is distinct from 'unknown' then raise exception 'unknown provenance';end if;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$declare n integer;begin
 if (select count(*) from public.garage_equipment_inventory)<>1 then raise exception 'member cannot read';end if;
 update public.garage_equipment_inventory set available=99 where equipment_key='romaskin';get diagnostics n=row_count;
 if n<>0 then raise exception 'member update allowed';end if;
 begin insert into public.garage_equipment_inventory(equipment_key,equipment_label,available) values ('bike','Bike',1);raise exception 'member insert allowed';exception when insufficient_privilege then null;end;
 if public.get_pt_wod_result('30000000-0000-0000-0000-000000000001',null)->'result_data'->>'participation_verified' is distinct from 'individual' then raise exception 'owner result unavailable';end if;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$begin
 if (select count(*) from public.garage_equipment_inventory)<>0 then raise exception 'inactive read';end if;
 begin perform public.get_pt_wod_result('30000000-0000-0000-0000-000000000001',null);raise exception 'inactive access allowed';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$begin
 begin perform public.get_pt_wod_result('30000000-0000-0000-0000-000000000001',null);raise exception 'unrelated member allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role anon;
do $$begin
 begin perform * from public.garage_equipment_inventory;raise exception 'anon read allowed';exception when insufficient_privilege then null;end;
 begin perform public.get_pt_wod_result('30000000-0000-0000-0000-000000000001',null);raise exception 'anon RPC allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
update public.pt_wod_assignments set scheduled_date='2026-12-02',scheduled_time='17:15' where id='30000000-0000-0000-0000-000000000004';
do $schedule$begin
 if (select scheduled_time from public.pt_wod_assignments where id='30000000-0000-0000-0000-000000000004') is distinct from '17:15'::time then raise exception 'staff reschedule';end if;
 begin update public.pt_wod_assignments set scheduled_date='2026-12-02' where id='30000000-0000-0000-0000-000000000001';raise exception 'completed update allowed';exception when invalid_parameter_value then null;end;
end$schedule$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $schedule$begin
 begin update public.pt_wod_assignments set scheduled_time='18:00' where id='30000000-0000-0000-0000-000000000004';raise exception 'member reschedule allowed';exception when insufficient_privilege then null;end;
end$schedule$;
reset role;
select 'ORDRE 006 SQL REHEARSAL PASSED' as result;
