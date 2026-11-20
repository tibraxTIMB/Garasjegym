create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null default '',
  category text not null default 'general' check (category in ('general','coffee','booking','pt','community','system')),
  href text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(recipient_id, is_read) where is_read=false;
alter table public.notifications enable row level security;
drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications for select to authenticated using (recipient_id=auth.uid());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated using (recipient_id=auth.uid()) with check (recipient_id=auth.uid());
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications for delete to authenticated using (recipient_id=auth.uid());
drop policy if exists notifications_staff_insert on public.notifications;
create policy notifications_staff_insert on public.notifications for insert to authenticated with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','manager')));
create or replace function public.notify_staff_new_coffee_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare customer_name text;
begin
  select coalesce(display_name,'Medlem') into customer_name from public.profiles where id=new.member_id;
  insert into public.notifications(recipient_id,title,body,category,href)
  select id,'Ny kaffibestilling',customer_name||' har sendt ei bestilling.','coffee','kaffi'
  from public.profiles where role in ('admin','manager') and active=true;
  return new;
end; $$;
drop trigger if exists coffee_order_notify_staff on public.coffee_orders;
create trigger coffee_order_notify_staff after insert on public.coffee_orders
for each row execute function public.notify_staff_new_coffee_order();
create or replace function public.notify_member_coffee_status()
returns trigger language plpgsql security definer set search_path=public as $$
declare status_label text;
begin
 if new.status is distinct from old.status then
  status_label := case new.status when 'preparing' then 'I produksjon' when 'ready' then 'Ferdig – klar for henting' when 'collected' then 'Henta' when 'cancelled' then 'Avbroten' else new.status end;
  insert into public.notifications(recipient_id,title,body,category,href)
  values(new.member_id,'Oppdatert kaffibestilling', 'Bestillinga di er no: '||status_label||'.','coffee','kaffi');
 end if;
 return new;
end; $$;
drop trigger if exists coffee_order_notify_member on public.coffee_orders;
create trigger coffee_order_notify_member after update of status on public.coffee_orders
for each row execute function public.notify_member_coffee_status();