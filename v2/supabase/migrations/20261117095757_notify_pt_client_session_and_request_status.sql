create or replace function public.notify_member_pt_request_status()
returns trigger language plpgsql security definer set search_path=public as $$
declare status_label text;
begin
 if new.status is distinct from old.status and new.status in ('approved','declined','cancelled') then
  status_label:=case new.status when 'approved' then 'Godkjend' when 'declined' then 'Avslått' else 'Avlyst' end;
  insert into public.notifications(recipient_id,title,body,category,href)
  values(new.member_id,'PT-førespurnaden er oppdatert', 'Status: '||status_label||'.','pt','pt');
 end if;
 return new;
end; $$;
drop trigger if exists pt_request_notify_member_status on public.pt_requests;
create trigger pt_request_notify_member_status after update of status on public.pt_requests
for each row execute function public.notify_member_pt_request_status();

create or replace function public.notify_member_new_pt_session()
returns trigger language plpgsql security definer set search_path=public as $$
declare coach_name text;
begin
 if new.client_id is not null then
  select coalesce(display_name,'PT-trenar') into coach_name from public.profiles where id=new.created_by;
  insert into public.notifications(recipient_id,title,body,category,href)
  values(new.client_id,'Ny PT-time er oppretta',coalesce(new.title,'PT-time')||' er lagd til i PT-studioet ditt.','pt','pt');
 end if;
 return new;
end; $$;
drop trigger if exists pt_session_notify_client on public.pt_sessions;
create trigger pt_session_notify_client after insert on public.pt_sessions
for each row execute function public.notify_member_new_pt_session();