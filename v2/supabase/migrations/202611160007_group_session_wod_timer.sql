-- GarasjeGym 2.0: shared WOD and timer state for group sessions.
-- Staged only. Review and apply with the approved 2.0 migration pack.
alter table public.class_live_sessions
  add column if not exists wod_id uuid references public.wods(id) on delete set null,
  add column if not exists timer_format text,
  add column if not exists timer_duration_seconds integer,
  add column if not exists timer_started_at timestamptz,
  add column if not exists timer_elapsed_seconds integer not null default 0,
  add column if not exists timer_status text not null default 'idle';

alter table public.class_live_sessions
  drop constraint if exists class_live_sessions_timer_duration_check,
  drop constraint if exists class_live_sessions_timer_elapsed_check,
  drop constraint if exists class_live_sessions_timer_status_check;

alter table public.class_live_sessions
  add constraint class_live_sessions_timer_duration_check
    check (timer_duration_seconds is null or timer_duration_seconds between 1 and 86400),
  add constraint class_live_sessions_timer_elapsed_check
    check (timer_elapsed_seconds between 0 and 86400),
  add constraint class_live_sessions_timer_status_check
    check (timer_status in ('idle','running','paused','finished'));

comment on column public.class_live_sessions.wod_id is 'Published WOD selected for this shared class session.';
comment on column public.class_live_sessions.timer_started_at is 'Server timestamp from which clients derive the synchronized elapsed time.';
comment on column public.class_live_sessions.timer_elapsed_seconds is 'Accumulated elapsed seconds, updated when the shared timer pauses or finishes.';
