-- GarasjeGym 2.0: associate personal workout results with a live group session.
-- Staged only. Apply after reviewing the complete 2.0 migration pack.
alter table public.workout_logs
  add column if not exists class_live_session_id uuid references public.class_live_sessions(id) on delete set null;
create index if not exists workout_logs_class_live_session_idx
  on public.workout_logs(class_live_session_id) where class_live_session_id is not null;

-- GarasjeGym 2.0: atomic workout save
-- Apply only after reviewing this migration in the Supabase SQL editor.
-- SECURITY INVOKER keeps the caller's existing RLS policies in force.
create or replace function public.save_workout_atomic(p_workout jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_log_id uuid;
  v_exercise_id uuid;
  v_item jsonb;
  v_set jsonb;
  v_index integer := 0;
  v_set_index integer;
  v_title text;
  v_class_session_id uuid;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst for å lagra trening.';
  end if;

  v_title := nullif(btrim(p_workout->>'title'), '');
  if v_title is null then
    raise exception 'Økta må ha eit namn.';
  end if;
  if jsonb_typeof(coalesce(p_workout->'exercises', '[]'::jsonb)) <> 'array' then
    raise exception 'Øvingslista har ugyldig format.';
  end if;
  if jsonb_array_length(coalesce(p_workout->'exercises', '[]'::jsonb)) = 0 then
    raise exception 'Legg til minst éi øving.';
  end if;

  v_class_session_id := nullif(p_workout->>'class_live_session_id','')::uuid;
  if v_class_session_id is not null and not public.is_admin_or_manager() and not exists (
    select 1
    from public.class_live_sessions s
    join public.class_bookings b on b.class_id = s.class_id
    where s.id = v_class_session_id
      and b.member_id = v_user_id
      and b.status = 'confirmed'
  ) then
    raise exception 'Du må vera påmeld gruppetimen for å knyta resultatet til økta.';
  end if;

  insert into public.workout_logs (
    member_id, source_wod_id, class_live_session_id, title, workout_date, format, rounds,
    score_rounds, score_reps, note
  ) values (
    v_user_id,
    nullif(p_workout->>'source_wod_id','')::uuid,
    v_class_session_id,
    v_title,
    coalesce(nullif(p_workout->>'workout_date','')::date, current_date),
    coalesce(nullif(p_workout->>'format',''), 'Fri trening'),
    greatest(1, coalesce(nullif(p_workout->>'rounds','')::integer, 1)),
    nullif(p_workout->>'score_rounds','')::integer,
    nullif(p_workout->>'score_reps','')::integer,
    coalesce(p_workout->>'note','')
  ) returning id into v_log_id;

  for v_item in select value from jsonb_array_elements(p_workout->'exercises')
  loop
    v_index := v_index + 1;
    if nullif(btrim(v_item->>'exercise_name'),'') is null then
      raise exception 'Øving nummer % manglar namn.', v_index;
    end if;

    insert into public.workout_exercises (
      workout_log_id, exercise_id, exercise_name, source_text, sort_order
    ) values (
      v_log_id,
      nullif(v_item->>'exercise_id','')::uuid,
      btrim(v_item->>'exercise_name'),
      nullif(v_item->>'source_text',''),
      v_index - 1
    ) returning id into v_exercise_id;

    v_set_index := 0;
    for v_set in
      select value from jsonb_array_elements(coalesce(v_item->'sets','[]'::jsonb))
    loop
      v_set_index := v_set_index + 1;
      if nullif(v_set->>'reps','') is not null
         or nullif(v_set->>'load_kg','') is not null
         or nullif(v_set->>'time_text','') is not null
         or nullif(v_set->>'time_seconds','') is not null then
        insert into public.workout_sets (
          workout_exercise_id, set_number, reps, load_kg, time_text, time_seconds
        ) values (
          v_exercise_id, v_set_index,
          nullif(v_set->>'reps','')::numeric,
          nullif(v_set->>'load_kg','')::numeric,
          nullif(v_set->>'time_text',''),
          nullif(v_set->>'time_seconds','')::numeric
        );
      end if;
    end loop;
  end loop;

  return v_log_id;
end;
$$;

revoke all on function public.save_workout_atomic(jsonb) from public, anon;
grant execute on function public.save_workout_atomic(jsonb) to authenticated;
