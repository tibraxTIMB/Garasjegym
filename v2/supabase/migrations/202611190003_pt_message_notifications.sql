create or replace function public.notify_pt_message()
returns trigger language plpgsql security definer set search_path=public as $$
declare sender_name text;
begin
 select coalesce(display_name,'Medlem') into sender_name from public.profiles where id=new.sender_id;
 if new.sender_id=new.client_id then
  insert into public.notifications(recipient_id,title,body,category,href,priority,requires_action,dedupe_key)
  select id,'Ny melding frå '||sender_name,left(coalesce(new.body,''),180),'pt','pt-client:'||new.client_id::text,'high',true,'pt-message:'||new.id::text
  from public.profiles where role in ('admin','manager') and active=true
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
 else
  insert into public.notifications(recipient_id,title,body,category,href,priority,requires_ack,dedupe_key)
  values(new.client_id,'Ny melding frå PT',left(coalesce(new.body,''),180),'pt','pt-studio','normal',false,'pt-message:'||new.id::text)
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
 end if;
 return new;
end; $$;

drop trigger if exists pt_message_notify_recipient on public.pt_messages;
create trigger pt_message_notify_recipient after insert on public.pt_messages
for each row execute function public.notify_pt_message();
