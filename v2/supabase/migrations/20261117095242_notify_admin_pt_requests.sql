create or replace function public.notify_staff_new_pt_request()
returns trigger language plpgsql security definer set search_path=public as $$
declare member_name text;
begin
 select coalesce(display_name,'Medlem') into member_name from public.profiles where id=new.member_id;
 insert into public.notifications(recipient_id,title,body,category,href)
 select id,'Ny PT-førespurnad',member_name||' har bede om PT-time.','pt','pt'
 from public.profiles where role in ('admin','manager') and active=true;
 return new;
end; $$;
drop trigger if exists pt_request_notify_staff on public.pt_requests;
create trigger pt_request_notify_staff after insert on public.pt_requests
for each row execute function public.notify_staff_new_pt_request();