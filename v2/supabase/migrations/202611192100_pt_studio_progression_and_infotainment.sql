-- Generic PT courses, progression metadata, member ranks, and privacy-safe kiosk schedule.
-- Existing templates/programs are retained as intro-type for backwards compatibility.

alter table public.profiles
  add column if not exists member_rank text;

alter table public.profiles
  drop constraint if exists profiles_member_rank_length_check;

alter table public.profiles
  add constraint profiles_member_rank_length_check
  check (member_rank is null or char_length(member_rank) <= 40);

comment on column public.profiles.member_rank is
  'Staff-assigned training rank shown in PT Studio. Null means no rank has been assigned.';

alter table public.pt_program_templates
  add column if not exists template_type text not null default 'intro';

alter table public.pt_program_templates
  drop constraint if exists pt_program_templates_template_type_check;

alter table public.pt_program_templates
  add constraint pt_program_templates_template_type_check
  check (template_type in ('intro','course','training_plan','progression'));

alter table public.pt_programs
  add column if not exists program_type text not null default 'intro';

alter table public.pt_programs
  drop constraint if exists pt_programs_program_type_check;

alter table public.pt_programs
  add constraint pt_programs_program_type_check
  check (program_type in ('intro','course','training_plan','progression'));

comment on column public.pt_program_templates.template_type is
  'Template category: intro, course, training_plan, or progression.';
comment on column public.pt_programs.program_type is
  'Program category copied from its source template or selected for a custom program.';

create or replace function public.create_pt_program_with_sessions(p_program jsonb, p_sessions jsonb)
returns uuid
language plpgsql
security definer
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
    raise exception 'Programmet må innehalda minst éi økt eller eitt steg.';
  end if;
  if nullif(btrim(p_program->>'title'), '') is null
    or nullif(p_program->>'client_id', '') is null then
    raise exception 'Programmet må ha namn og kunde.';
  end if;
  if coalesce(nullif(p_program->>'program_type',''),'intro') not in ('intro','course','training_plan','progression') then
    raise exception 'Ugyldig programtype.';
  end if;

  insert into public.pt_programs(
    client_id, template_id, title, description, start_date, weeks,
    focus_areas, status, created_by, coach_notes, program_type
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
    coalesce(p_program->>'coach_notes', ''),
    coalesce(nullif(p_program->>'program_type',''),'intro')
  ) returning id into v_program_id;

  for v_session in select value from jsonb_array_elements(p_sessions) loop
    v_index := v_index + 1;
    if nullif(btrim(v_session->>'title'), '') is null then
      raise exception 'Programsteg nummer % manglar namn.', v_index;
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

revoke all on function public.create_pt_program_with_sessions(jsonb,jsonb) from public, anon;
grant execute on function public.create_pt_program_with_sessions(jsonb,jsonb) to authenticated;

create or replace function public.get_infotainment_schedule(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  event_key text,
  category text,
  title text,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'Aktiv innlogging er kravd for garasjeskjermen.';
  end if;
  if p_from is null or p_to is null or p_to <= p_from or p_to - p_from > interval '31 days' then
    raise exception 'Ugyldig tidsperiode.';
  end if;

  return query
  select
    'class-' || c.id::text,
    'class'::text,
    c.title,
    c.starts_at,
    c.starts_at + make_interval(mins => greatest(1,c.duration_minutes))
  from public.classes c
  where c.published = true
    and c.cancelled_at is null
    and c.starts_at >= p_from
    and c.starts_at < p_to

  union all

  select
    'pt-' || s.id::text,
    'pt'::text,
    'PT-time'::text,
    s.starts_at,
    s.starts_at + make_interval(mins => greatest(1,s.duration_minutes))
  from public.pt_sessions s
  where s.client_id is not null
    and s.status in ('planned','published')
    and s.starts_at >= p_from
    and s.starts_at < p_to

  order by 4;
end;
$function$;

revoke all on function public.get_infotainment_schedule(timestamptz,timestamptz) from public, anon;
grant execute on function public.get_infotainment_schedule(timestamptz,timestamptz) to authenticated;

comment on function public.get_infotainment_schedule(timestamptz,timestamptz) is
  'Returns only published group-class details and anonymized PT busy slots. Never returns PT client names, IDs, notes, or private appointment titles.';
