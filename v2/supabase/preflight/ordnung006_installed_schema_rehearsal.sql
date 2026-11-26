-- EXACT installed schema excerpt from migration 20261126150410.
-- Isolated fixture only. Not a migration. Production inventory seed deliberately omitted.
-- Candidate: not a production migration. Test with active member, inactive member,
-- authorized manager and anon before approval. Never reuse unrelated settings tables.

create table public.garage_equipment_inventory (
 equipment_key text primary key check (length(equipment_key) between 1 and 160 and equipment_key=lower(btrim(equipment_key))),
 equipment_label text not null check (length(btrim(equipment_label)) between 1 and 160),
 available integer check (available between 0 and 999),
 inventory_kind text not null default 'capacity' check (inventory_kind in ('capacity','item')),
 group_key text check (group_key is null or (length(group_key) between 1 and 160 and group_key=lower(btrim(group_key)))),
 weight_kg numeric check (weight_kg is null or (weight_kg>0 and weight_kg<=1000)),
 notes text not null default '' check (length(notes)<=1000),
 constraint inventory_detail_shape check ((inventory_kind='capacity' and available is not null and group_key is null and weight_kg is null) or (inventory_kind='item' and group_key is not null and equipment_key like 'item:%')),
 updated_at timestamptz not null default now(),
 updated_by uuid default auth.uid() references public.profiles(id) on delete set null
);
alter table public.garage_equipment_inventory enable row level security;
revoke all on public.garage_equipment_inventory from public,anon,authenticated;
grant select,insert,update on public.garage_equipment_inventory to authenticated;
create policy inventory_read_active on public.garage_equipment_inventory for select to authenticated using ((select public.is_active_user()));
create policy inventory_insert_staff on public.garage_equipment_inventory for insert to authenticated with check ((select public.is_active_user()) and (select public.is_admin_or_manager()) and updated_by=(select auth.uid()));
create policy inventory_update_staff on public.garage_equipment_inventory for update to authenticated using ((select public.is_active_user()) and (select public.is_admin_or_manager())) with check ((select public.is_active_user()) and (select public.is_admin_or_manager()) and updated_by=(select auth.uid()));

-- Candidate only. Extends existing assignment rows; no parallel scheduling table.

alter table public.pt_wod_assignments
 add column scheduled_date date,
 add column scheduled_time time without time zone,
 add constraint pt_wod_assignment_schedule_time_requires_date check (scheduled_time is null or scheduled_date is not null),
 add constraint pt_wod_assignment_schedule_not_booking check (linked_session_id is null or (scheduled_date is null and scheduled_time is null));
create or replace function app_private.guard_pt_assignment_schedule()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
begin
 if new.scheduled_date is not distinct from old.scheduled_date and new.scheduled_time is not distinct from old.scheduled_time then return new; end if;
 if (select public.is_active_user()) is distinct from true or (select public.is_admin_or_manager()) is distinct from true then
  raise exception 'Berre aktivt driftspersonell kan flytta ei enkeltståande WOD-tildeling.' using errcode='42501';
 end if;
 if old.status <> 'assigned' or new.status <> 'assigned' or old.workout_log_id is not null or new.workout_log_id is not null or old.linked_session_id is not null or new.linked_session_id is not null then
  raise exception 'Berre ikkje påbegynte, enkeltståande tildelingar kan flyttast.' using errcode='22023';
 end if;
 return new;
end;
$$;
revoke all on function app_private.guard_pt_assignment_schedule() from public,anon,authenticated;
create trigger pt_assignment_schedule_guard before update of scheduled_date,scheduled_time on public.pt_wod_assignments for each row execute function app_private.guard_pt_assignment_schedule();

-- Candidate only. Review and isolated role rehearsal required before migration.
-- Existing security-definer body and grants unchanged; only minimal result flags extended.
create or replace function public.get_pt_wod_result(
 p_assignment_id uuid default null,
 p_program_session_id uuid default null
) returns jsonb
language plpgsql stable security definer
set search_path to 'pg_catalog','public','pg_temp'
as $function$
declare
 v_actor uuid := auth.uid();
 v_member uuid;
 v_wod uuid;
 v_log uuid;
 v_status text;
 v_row public.workout_logs%rowtype;
begin
 if v_actor is null or public.is_active_user() is distinct from true then
  raise exception 'Ingen tilgang til PT-resultatet.' using errcode='42501';
 end if;
 if num_nonnulls(p_assignment_id,p_program_session_id)<>1 then
  raise exception 'Vel nøyaktig éi PT-tildeling.' using errcode='22023';
 end if;
 if p_assignment_id is not null then
  select a.member_id,a.wod_id,a.workout_log_id,a.status
   into v_member,v_wod,v_log,v_status
   from public.pt_wod_assignments a where a.id=p_assignment_id;
 else
  select p.client_id,ps.wod_id,ps.workout_log_id,ps.status
   into v_member,v_wod,v_log,v_status
   from public.pt_program_sessions ps
   join public.pt_programs p on p.id=ps.program_id
   where ps.id=p_program_session_id and ps.wod_id is not null;
 end if;
 if not found or (
  v_member is distinct from v_actor
  and public.is_admin_or_manager() is distinct from true
  and app_private.is_pt_coach_for_member(v_member) is distinct from true
 ) then
  raise exception 'Ingen tilgang til PT-resultatet.' using errcode='42501';
 end if;
 if v_status is distinct from 'completed' or v_log is null then
  return null;
 end if;
 select wl.* into v_row from public.workout_logs wl
  where wl.id=v_log and wl.member_id=v_member and wl.source_wod_id=v_wod;
 if not found then return null; end if;
 return jsonb_build_object(
  'id',v_row.id,'workout_date',v_row.workout_date,
  'title',v_row.title,'format',v_row.format,
  'score_rounds',v_row.score_rounds,'score_reps',v_row.score_reps,
  'score_time_seconds',v_row.score_time_seconds,
  'score_load_kg',v_row.score_load_kg,
  'score_calories',v_row.score_calories,
  'score_distance',v_row.score_distance,'score_unit',v_row.score_unit,
  'result_data',jsonb_build_object(
   'participation_verified', case when coalesce(v_row.result_data->'samspel'->>'team_score','false')='true' or coalesce(v_row.result_data->'wod_engine'->>'participation','individual')<>'individual' then 'team' when v_row.result_data->'wod_engine'->>'participation'='individual' then 'individual' when v_row.result_data->>'manual_entry'='true' and v_row.source_wod_id is null then 'individual' else 'unknown' end,
   'flow_completion_only',v_row.result_data->'flow_completion_only',
   'elapsed_seconds',v_row.result_data->'elapsed_seconds',
   'split_seconds',v_row.result_data->'split_seconds',
   'block_summary',v_row.result_data->'block_summary',
   'exercise_results',v_row.result_data->'exercise_results',
   'prescription_level',v_row.result_data->'prescription_level',
   'combination_mode',v_row.result_data->'combination_mode',
   'time_cap_reached',v_row.result_data->'time_cap_reached',
   'completion_status',v_row.result_data->'completion_status',
   'death_by',v_row.result_data->'death_by',
   'ladder',v_row.result_data->'ladder'
  )
 );
end;
$function$;
revoke all on function public.get_pt_wod_result(uuid,uuid) from public,anon;
grant execute on function public.get_pt_wod_result(uuid,uuid) to authenticated;


