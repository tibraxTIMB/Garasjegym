alter table public.class_live_sessions
  add column if not exists wod_ids jsonb not null default '[]'::jsonb,
  add column if not exists active_wod_index integer not null default 0;

update public.class_live_sessions
set wod_ids = case
  when jsonb_array_length(coalesce(wod_ids,'[]'::jsonb)) = 0 and wod_id is not null
    then jsonb_build_array(wod_id::text)
  else coalesce(wod_ids,'[]'::jsonb)
end
where jsonb_array_length(coalesce(wod_ids,'[]'::jsonb)) = 0;