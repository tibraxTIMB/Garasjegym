-- Keep PT client assignment and program creation atomic.
-- SECURITY INVOKER: existing RLS policies remain the authority.

create or replace function public.assign_pt_coach(
  p_member_id uuid,
  p_coach_user_id uuid,
  p_admin_note text default '',
  p_service_request_id uuid default null
)
returns uuid
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_capacity integer;
  v_active_count integer;
  v_assignment_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre aktiv admin eller manager kan tildele PT.';
  end if;
  if p_member_id is null or p_coach_user_id is null then
    raise exception 'Vel både medlem og PT.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('pt-member:' || p_member_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('pt-coach:' || p_coach_user_id::text, 0));

  select c.capacity into v_capacity
  from public.pt_coaches c
  where c.user_id = p_coach_user_id and c.is_active = true
  for update;

  if not found then
    raise exception 'PT-en er ikkje registrert eller aktiv.';
  end if;

  select count(*) into v_active_count
  from public.pt_client_assignments a
  where a.coach_user_id = p_coach_user_id
    and a.status = 'active'
    and a.member_id <> p_member_id;

  if v_active_count >= v_capacity then
    raise exception 'PT-en har nådd kapasiteten sin (% kundar).', v_capacity;
  end if;

  if p_service_request_id is not null and not exists (
    select 1 from public.pt_service_requests r
    where r.id = p_service_request_id
      and r.member_id = p_member_id
      and r.status = 'pending'
    for update
  ) then
    raise exception 'PT-bestillinga er ikkje lenger ventande for dette medlemmet.';
  end if;

  update public.pt_client_assignments
  set status = 'ended', ended_at = now(), updated_at = now()
  where member_id = p_member_id and status = 'active';

  insert into public.pt_client_assignments(member_id, coach_user_id, assigned_by, admin_note)
  values (p_member_id, p_coach_user_id, auth.uid(), coalesce(p_admin_note, ''))
  returning id into v_assignment_id;

  if p_service_request_id is not null then
    update public.pt_service_requests
    set status = 'assigned',
        assigned_coach_id = p_coach_user_id,
        handled_by = auth.uid(),
        handled_at = now(),
        updated_at = now()
    where id = p_service_request_id
      and member_id = p_member_id
      and status = 'pending';

    if not found then
      raise exception 'PT-bestillinga kunne ikkje oppdaterast. Ingen endringar er lagra.';
    end if;
  end if;

  return v_assignment_id;
end;
$function$;

create or replace function public.create_pt_program_with_sessions(
  p_program jsonb,
  p_sessions jsonb
)
returns uuid
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_program_id uuid;
  v_session jsonb;
  v_index integer := 0;
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre aktiv admin eller manager kan oppretta PT-program.';
  end if;
  if jsonb_typeof(p_program) <> 'object' then
    raise exception 'Programdata er ugyldige.';
  end if;
  if jsonb_typeof(p_sessions) <> 'array' or jsonb_array_length(p_sessions) = 0 then
    raise exception 'Programmet må innehalda minst éi økt.';
  end if;
  if nullif(btrim(p_program->>'title'), '') is null
    or nullif(p_program->>'client_id', '') is null then
    raise exception 'Programmet må ha namn og kunde.';
  end if;

  insert into public.pt_programs(
    client_id, template_id, title, description, start_date, weeks,
    focus_areas, status, created_by, coach_notes
  ) values (
    (p_program->>'client_id')::uuid,
    nullif(p_program->>'template_id', '')::uuid,
    btrim(p_program->>'title'),
    coalesce(p_program->>'description', ''),
    nullif(p_program->>'start_date', '')::date,
    greatest(1, coalesce(nullif(p_program->>'weeks', '')::integer, 6)),
    case when jsonb_typeof(p_program->'focus_areas') = 'array'
      then array(select jsonb_array_elements_text(p_program->'focus_areas'))
      else '{}'::text[] end,
    'active',
    auth.uid(),
    coalesce(p_program->>'coach_notes', '')
  ) returning id into v_program_id;

  for v_session in select value from jsonb_array_elements(p_sessions) loop
    v_index := v_index + 1;
    if nullif(btrim(v_session->>'title'), '') is null then
      raise exception 'Programøkt nummer % manglar namn.', v_index;
    end if;
    insert into public.pt_program_sessions(
      program_id, sequence_no, title, wod_id, scheduled_date,
      workout_snapshot, coach_note, status, week_no, day_no,
      session_kind, focus_area, estimated_minutes
    ) values (
      v_program_id,
      coalesce(nullif(v_session->>'sequence_no', '')::integer, v_index),
      btrim(v_session->>'title'),
      nullif(v_session->>'wod_id', '')::uuid,
      nullif(v_session->>'scheduled_date', '')::date,
      case when jsonb_typeof(v_session->'workout_snapshot') = 'object'
        then v_session->'workout_snapshot' else '{}'::jsonb end,
      coalesce(v_session->>'coach_note', ''),
      coalesce(nullif(v_session->>'status', ''), 'planned'),
      greatest(1, coalesce(nullif(v_session->>'week_no', '')::integer, 1)),
      greatest(1, coalesce(nullif(v_session->>'day_no', '')::integer, 1)),
      coalesce(nullif(v_session->>'session_kind', ''), 'training'),
      coalesce(v_session->>'focus_area', ''),
      nullif(v_session->>'estimated_minutes', '')::integer
    );
  end loop;

  return v_program_id;
end;
$function$;

revoke all on function public.assign_pt_coach(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.assign_pt_coach(uuid, uuid, text, uuid) to authenticated;
revoke all on function public.create_pt_program_with_sessions(jsonb, jsonb) from public, anon;
grant execute on function public.create_pt_program_with_sessions(jsonb, jsonb) to authenticated;
