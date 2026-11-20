
alter table public.workout_sets
  add column if not exists height_cm numeric;

alter table public.workout_sets
  drop constraint if exists workout_sets_height_cm_positive;
alter table public.workout_sets
  add constraint workout_sets_height_cm_positive
  check (height_cm is null or height_cm > 0);

create or replace function public.save_workout_atomic(p_workout jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $function$
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
  v_save_token uuid;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst for å lagra trening.';
  end if;

  v_title := nullif(btrim(p_workout->>'title'), '');
  if v_title is null then raise exception 'Økta må ha eit namn.'; end if;

  v_save_token := nullif(p_workout->>'save_token','')::uuid;
  if v_save_token is null then raise exception 'Lagreøkta manglar tryggleiksnøkkel. Prøv igjen.'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || v_save_token::text, 0));
  select id into v_log_id from public.workout_logs
    where member_id=v_user_id and save_token=v_save_token;
  if v_log_id is not null then return v_log_id; end if;

  if jsonb_typeof(coalesce(p_workout->'exercises', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_workout->'exercises', '[]'::jsonb)) = 0 then
    raise exception 'Legg til minst éi øving før du lagrar økta.';
  end if;

  v_class_session_id := nullif(p_workout->>'class_live_session_id','')::uuid;
  if v_class_session_id is not null and not public.is_admin_or_manager() and not exists (
    select 1 from public.class_live_sessions s
    join public.class_bookings b on b.class_id=s.class_id
    where s.id=v_class_session_id and b.member_id=v_user_id and b.status='confirmed'
  ) then
    raise exception 'Du må vera påmeld gruppetimen for å knyta resultatet til økta.';
  end if;

  insert into public.workout_logs (
    member_id,save_token,source_wod_id,class_live_session_id,title,workout_date,format,rounds,
    score_rounds,score_reps,score_time_seconds,score_load_kg,score_calories,
    score_distance,score_unit,result_data,note
  ) values (
    v_user_id,v_save_token,nullif(p_workout->>'source_wod_id','')::uuid,v_class_session_id,v_title,
    coalesce(nullif(p_workout->>'workout_date','')::date,current_date),
    coalesce(nullif(p_workout->>'format',''),'Fri trening'),
    greatest(1,coalesce(nullif(p_workout->>'rounds','')::integer,1)),
    nullif(p_workout->>'score_rounds','')::integer,nullif(p_workout->>'score_reps','')::integer,
    nullif(p_workout->>'score_time_seconds','')::numeric,nullif(p_workout->>'score_load_kg','')::numeric,
    nullif(p_workout->>'score_calories','')::numeric,nullif(p_workout->>'score_distance','')::numeric,
    nullif(p_workout->>'score_unit',''),
    case when jsonb_typeof(p_workout->'result_data')='object' then p_workout->'result_data' else '{}'::jsonb end,
    coalesce(p_workout->>'note','')
  ) returning id into v_log_id;

  for v_item in select value from jsonb_array_elements(coalesce(p_workout->'exercises','[]'::jsonb)) loop
    v_index:=v_index+1;
    if nullif(btrim(v_item->>'exercise_name'),'') is null then
      raise exception 'Øving nummer % manglar namn.',v_index;
    end if;

    insert into public.workout_exercises(workout_log_id,exercise_id,exercise_name,source_text,sort_order)
    values(v_log_id,nullif(v_item->>'exercise_id','')::uuid,btrim(v_item->>'exercise_name'),
      nullif(v_item->>'source_text',''),coalesce(nullif(v_item->>'sort_order','')::integer,v_index))
    returning id into v_exercise_id;

    v_set_index:=0;
    for v_set in select value from jsonb_array_elements(case when jsonb_typeof(v_item->'sets')='array' then v_item->'sets' else '[]'::jsonb end) loop
      v_set_index:=v_set_index+1;
      if nullif(v_set->>'reps','') is not null
        or nullif(v_set->>'load_kg','') is not null
        or nullif(v_set->>'time_text','') is not null
        or nullif(v_set->>'time_seconds','') is not null
        or nullif(v_set->>'height_cm','') is not null then
        insert into public.workout_sets(workout_exercise_id,set_number,reps,load_kg,time_text,time_seconds,height_cm)
        values(v_exercise_id,v_set_index,nullif(v_set->>'reps','')::numeric,nullif(v_set->>'load_kg','')::numeric,
          nullif(v_set->>'time_text',''),nullif(v_set->>'time_seconds','')::numeric,nullif(v_set->>'height_cm','')::numeric);
      end if;
    end loop;
  end loop;

  return v_log_id;
end;
$function$;
