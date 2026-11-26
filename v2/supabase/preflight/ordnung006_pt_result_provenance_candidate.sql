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

