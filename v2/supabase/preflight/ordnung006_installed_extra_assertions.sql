\set ON_ERROR_STOP on
-- More role cases on the installed schema, after the existing assertions.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
update public.garage_equipment_inventory set available=3,updated_by=auth.uid() where equipment_key='romaskin';
do $$begin
 if (select available from public.garage_equipment_inventory where equipment_key='romaskin') is distinct from 3 then raise exception 'manager inventory update';end if;
 begin update public.garage_equipment_inventory set updated_by='00000000-0000-0000-0000-000000000001' where equipment_key='romaskin';raise exception 'manager spoofed audit actor';exception when insufficient_privilege then null;end;
 if public.get_pt_wod_result('30000000-0000-0000-0000-000000000001',null)->'result_data'->>'participation_verified' is distinct from 'individual' then raise exception 'manager result access';end if;
end$$;
update public.pt_wod_assignments set scheduled_date='2026-12-03',scheduled_time='19:00' where id='30000000-0000-0000-0000-000000000004';
do $$begin
 if (select scheduled_time from public.pt_wod_assignments where id='30000000-0000-0000-0000-000000000004') is distinct from '19:00'::time then raise exception 'manager schedule';end if;
end$$;
reset role;
select 'INSTALLED SCHEMA ROLE REHEARSAL PASSED' as result;
