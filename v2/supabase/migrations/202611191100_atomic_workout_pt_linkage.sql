-- Save workout history and PT completion linkage in one transaction.
-- The wrapper is SECURITY INVOKER so existing RLS policies remain in force.

create or replace function public.save_workout_with_pt_links(
  p_workout jsonb,
  p_assignment_id uuid default null,
  p_program_session_id uuid default null
)
returns uuid
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_status text;
  v_existing_log_id uuid;
  v_linked_wod_id uuid;
  v_source_wod_id uuid := nullif(p_workout->>'source_wod_id','')::uuid;
  v_updated_id uuid;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst for å lagra trening.';
  end if;

  v_workout_id := public.save_workout_atomic(p_workout);

  if p_assignment_id is not null then
    select a.status, a.workout_log_id, a.wod_id
      into v_status, v_existing_log_id, v_linked_wod_id
    from public.pt_wod_assignments a
    where a.id = p_assignment_id and a.member_id = v_user_id;

    if not found then
      raise exception 'PT-tildelinga finst ikkje eller høyrer ikkje til deg.';
    end if;
    if v_linked_wod_id is distinct from v_source_wod_id then
      raise exception 'Treningsøkta samsvarar ikkje med WOD-en som er tildelt.';
    end if;

    if v_status = 'completed' then
      if v_existing_log_id is distinct from v_workout_id then
        raise exception 'PT-tildelinga er allereie fullført med ei anna treningsøkt.';
      end if;
    elsif v_status in ('assigned','in_progress') then
      update public.pt_wod_assignments
      set status='completed', completed_at=coalesce(completed_at,now()), workout_log_id=v_workout_id
      where id=p_assignment_id and member_id=v_user_id and status in ('assigned','in_progress')
      returning id into v_updated_id;
      if v_updated_id is null then
        raise exception 'PT-tildelinga kunne ikkje fullførast. Ingen delvis lagring er gjort.';
      end if;
    else
      raise exception 'PT-tildelinga har ein status som ikkje kan fullførast.';
    end if;
  end if;

  if p_program_session_id is not null then
    select ps.status, ps.workout_log_id, ps.wod_id
      into v_status, v_existing_log_id, v_linked_wod_id
    from public.pt_program_sessions ps
    join public.pt_programs p on p.id=ps.program_id
    where ps.id=p_program_session_id and p.client_id=v_user_id;

    if not found then
      raise exception 'PT-programøkta finst ikkje eller høyrer ikkje til deg.';
    end if;
    if v_linked_wod_id is not null and v_linked_wod_id is distinct from v_source_wod_id then
      raise exception 'Treningsøkta samsvarar ikkje med WOD-en i PT-programmet.';
    end if;

    if v_status = 'completed' then
      if v_existing_log_id is distinct from v_workout_id then
        raise exception 'PT-programøkta er allereie fullført med ei anna treningsøkt.';
      end if;
    elsif v_status in ('planned','in_progress') then
      update public.pt_program_sessions
      set status='completed', completed_at=coalesce(completed_at,now()), workout_log_id=v_workout_id
      where id=p_program_session_id and status in ('planned','in_progress')
      returning id into v_updated_id;
      if v_updated_id is null then
        raise exception 'PT-programøkta kunne ikkje fullførast. Ingen delvis lagring er gjort.';
      end if;
    else
      raise exception 'PT-programøkta har ein status som ikkje kan fullførast.';
    end if;
  end if;

  return v_workout_id;
end;
$function$;

revoke all on function public.save_workout_with_pt_links(jsonb,uuid,uuid) from public, anon;
grant execute on function public.save_workout_with_pt_links(jsonb,uuid,uuid) to authenticated;
