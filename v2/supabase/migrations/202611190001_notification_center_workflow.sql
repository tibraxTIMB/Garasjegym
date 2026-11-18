alter table public.notifications
  add column if not exists priority text not null default 'normal',
  add column if not exists requires_ack boolean not null default false,
  add column if not exists requires_action boolean not null default false,
  add column if not exists status text not null default 'open',
  add column if not exists read_at timestamptz,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists dedupe_key text;

alter table public.notifications drop constraint if exists notifications_priority_check;
alter table public.notifications add constraint notifications_priority_check check (priority in ('low','normal','high','urgent'));
alter table public.notifications drop constraint if exists notifications_status_check;
alter table public.notifications add constraint notifications_status_check check (status in ('open','resolved','dismissed'));

create index if not exists notifications_recipient_inbox_idx on public.notifications (recipient_id, archived_at, created_at desc);
create index if not exists notifications_action_queue_idx on public.notifications (recipient_id, requires_action, status, created_at desc);
create unique index if not exists notifications_recipient_dedupe_idx on public.notifications (recipient_id, dedupe_key) where dedupe_key is not null;

update public.notifications set read_at=created_at where is_read=true and read_at is null;

create or replace function public.set_notification_read_at()
returns trigger language plpgsql as $$
begin
 if new.is_read=true and old.is_read=false and new.read_at is null then new.read_at:=now(); end if;
 if new.status in ('resolved','dismissed') and old.status='open' and new.resolved_at is null then new.resolved_at:=now(); end if;
 return new;
end; $$;

drop trigger if exists notifications_state_timestamps on public.notifications;
create trigger notifications_state_timestamps before update on public.notifications
for each row execute function public.set_notification_read_at();
