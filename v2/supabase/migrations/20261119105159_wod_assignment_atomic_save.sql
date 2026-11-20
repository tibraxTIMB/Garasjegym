create or replace function public.save_wod_with_pt_assignment(
  p_wod jsonb,
  p_member_id uuid,
  p_wod_id uuid default null
)
returns uuid
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_wod_id uuid;
begin
  if v_user_id is null
    or not public.is_active_user()
    or not public.is_admin_or_manager() then
    raise exception 'Berre aktiv admin eller manager kan oppretta og tildele PT-WOD.';
  end if;

  if jsonb_typeof(p_wod) <> 'object'
    or nullif(btrim(p_wod->>'name'), '') is null
    or p_member_id is null then
    raise exception 'WOD og kunde må vera gyldig valde.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_member_id
      and p.active = true
      and p.membership_status = 'approved'
  ) then
    raise exception 'Kunden har ikkje ein aktiv og godkjend medlemskonto.';
  end if;

  if p_wod_id is null then
    insert into public.wods (
      name, category, format, duration_minutes, movements, notes,
      is_published, created_by, timer_settings
    ) values (
      btrim(p_wod->>'name'),
      coalesce(nullif(p_wod->>'category', ''), 'main'),
      coalesce(nullif(p_wod->>'format', ''), 'Eigen økt'),
      nullif(p_wod->>'duration_minutes', '')::integer,
      coalesce(p_wod->>'movements', ''),
      coalesce(p_wod->>'notes', ''),
      coalesce((p_wod->>'is_published')::boolean, false),
      v_user_id,
      case when jsonb_typeof(p_wod->'timer_settings') = 'object' then p_wod->'timer_settings' else '{}'::jsonb end
    )
    returning id into v_wod_id;
  else
    update public.wods
    set name = btrim(p_wod->>'name'),
        category = coalesce(nullif(p_wod->>'category', ''), 'main'),
        format = coalesce(nullif(p_wod->>'format', ''), 'Eigen økt'),
        duration_minutes = nullif(p_wod->>'duration_minutes', '')::integer,
        movements = coalesce(p_wod->>'movements', ''),
        notes = coalesce(p_wod->>'notes', ''),
        is_published = coalesce((p_wod->>'is_published')::boolean, false),
        timer_settings = case when jsonb_typeof(p_wod->'timer_settings') = 'object' then p_wod->'timer_settings' else '{}'::jsonb end,
        updated_at = now()
    where id = p_wod_id
    returning id into v_wod_id;

    if v_wod_id is null then
      raise exception 'WOD-en finst ikkje eller kan ikkje redigerast.';
    end if;
  end if;

  insert into public.pt_wod_assignments (
    member_id, wod_id, assigned_by, location, coach_note, status
  ) values (
    p_member_id, v_wod_id, v_user_id, 'Valfritt', 'Tildelt frå PT Studio', 'assigned'
  );

  return v_wod_id;
end;
$function$;

revoke all on function public.save_wod_with_pt_assignment(jsonb, uuid, uuid) from public, anon;
grant execute on function public.save_wod_with_pt_assignment(jsonb, uuid, uuid) to authenticated;