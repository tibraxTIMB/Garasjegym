create index if not exists calendar_events_class_id_idx on public.calendar_events(class_id);
create index if not exists calendar_events_pt_session_id_idx on public.calendar_events(pt_session_id);
create index if not exists calendar_events_created_by_idx on public.calendar_events(created_by);
