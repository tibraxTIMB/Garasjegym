-- Gazelle: PT-resultat kan lesast berre gjennom ei konkret PT-WOD-tildeling.
-- Frontend får ikkje ny tilgang til workout_logs. Ingen eksisterande rader blir endra.

create table if not exists public.pt_wod_feedback (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid references public.pt_wod_assignments(id) on delete cascade,
 program_session_id uuid references public.pt_program_sessions(id) on delete cascade,
 client_id uuid not null references public.profiles(id) on delete cascade,
 coach_id uuid not null references public.profiles(id) on delete restrict,
 message_id uuid references public.pt_messages(id) on delete set null,
 dosing text not null check (dosing in ('appropriate','lighter','heavier','pacing','discuss')),
 body text not null check (length(trim(body)) between 5 and 2000),
 created_at timestamptz not null default now(),
 constraint pt_wod_feedback_one_source check (num_nonnulls(assignment_id,program_session_id)=1)
);
create index if not exists pt_wod_feedback_assignment_recent on public.pt_wod_feedback(assignment_id,created_at desc);
create index if not exists pt_wod_feedback_program_recent on public.pt_wod_feedback(program_session_id,created_at desc);
alter table public.pt_wod_feedback enable row level security;
revoke all on public.pt_wod_feedback from public, anon, authenticated;
grant select on public.pt_wod_feedback to authenticated;

drop policy if exists pt_wod_feedback_read_involved on public.pt_wod_feedback;
create policy pt_wod_feedback_read_involved on public.pt_wod_feedback for select to authenticated
using (
 public.is_active_user()
 and (
  client_id=(select auth.uid())
  or public.is_admin_or_manager()
  or app_private.is_pt_coach_for_member(client_id)
 )
 and (
  exists (select 1 from public.pt_wod_assignments a
          where a.id=assignment_id and a.member_id=client_id)
  or exists (select 1 from public.pt_program_sessions ps
             join public.pt_programs p on p.id=ps.program_id
             where ps.id=program_session_id and p.client_id=client_id)
 )
);

-- SECURITY DEFINER is necessary because workout_logs is private to the member.
-- The only allowed log is the one whose id, owner and WOD match this PT link.
-- Return an explicit whitelist of score fields; never private workout notes or other logs.
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

-- Atomic feedback: one WOD-specific record AND one regular PT chat message.
-- Both are created only for active staff/coach and a verified completed assignment.
create or replace function public.send_pt_wod_feedback(
 p_feedback_text text,
 p_dosing text default 'discuss',
 p_assignment_id uuid default null,
 p_program_session_id uuid default null
) returns uuid
language plpgsql security definer
set search_path to 'pg_catalog','public','pg_temp'
as $function$
declare
 v_actor uuid := auth.uid();
 v_member uuid;
 v_wod uuid;
 v_log uuid;
 v_status text;
 v_title text;
 v_message_id uuid;
 v_feedback_id uuid;
 v_label text;
begin
 if v_actor is null or public.is_active_user() is distinct from true then
  raise exception 'Ingen tilgang til PT-oppfølging.' using errcode='42501';
 end if;
 if num_nonnulls(p_assignment_id,p_program_session_id)<>1 then
  raise exception 'Vel nøyaktig éi PT-tildeling.' using errcode='22023';
 end if;
 if length(trim(coalesce(p_feedback_text,''))) not between 5 and 2000 then
  raise exception 'Tilbakemeldinga må ha 5–2000 teikn.' using errcode='22023';
 end if;
 if p_dosing not in ('appropriate','lighter','heavier','pacing','discuss') then
  raise exception 'Ugyldig doseringsvurdering.' using errcode='22023';
 end if;
 if p_assignment_id is not null then
  select a.member_id,a.wod_id,a.workout_log_id,a.status,w.name
   into v_member,v_wod,v_log,v_status,v_title
   from public.pt_wod_assignments a
   join public.wods w on w.id=a.wod_id where a.id=p_assignment_id;
 else
  select p.client_id,ps.wod_id,ps.workout_log_id,ps.status,coalesce(w.name,ps.title)
   into v_member,v_wod,v_log,v_status,v_title
   from public.pt_program_sessions ps
   join public.pt_programs p on p.id=ps.program_id
   left join public.wods w on w.id=ps.wod_id
   where ps.id=p_program_session_id and ps.wod_id is not null;
 end if;
 if not found or (
  public.is_admin_or_manager() is distinct from true
  and app_private.is_pt_coach_for_member(v_member) is distinct from true
 ) then
  raise exception 'Ingen tilgang til PT-oppfølging.' using errcode='42501';
 end if;
 if v_status is distinct from 'completed' or v_log is null
 or not exists(select 1 from public.workout_logs wl
  where wl.id=v_log and wl.member_id=v_member and wl.source_wod_id=v_wod) then
  raise exception 'WOD-en må vera fullført og knytt til rett resultat før tilbakemelding.' using errcode='22023';
 end if;
 v_label:=case p_dosing
  when 'appropriate' then 'Passande dosering'
  when 'lighter' then 'Vurder lettare'
  when 'heavier' then 'Vurder tyngre'
  when 'pacing' then 'Juster disponering'
  else 'Ta opp neste gong' end;
 insert into public.pt_messages(client_id,sender_id,body)
 values(v_member,v_actor,'Tilbakemelding på WOD «'||coalesce(v_title,'PT-WOD')||'» · '||v_label||E'\n'||trim(p_feedback_text))
 returning id into v_message_id;
 insert into public.pt_wod_feedback(assignment_id,program_session_id,client_id,coach_id,message_id,dosing,body)
 values(p_assignment_id,p_program_session_id,v_member,v_actor,v_message_id,p_dosing,trim(p_feedback_text))
 returning id into v_feedback_id;
 return v_feedback_id;
end;
$function$;
revoke all on function public.send_pt_wod_feedback(text,text,uuid,uuid) from public,anon;
grant execute on function public.send_pt_wod_feedback(text,text,uuid,uuid) to authenticated;
