create or replace function public.notify_staff_new_pt_request()
returns trigger language plpgsql security definer set search_path=public as $$
declare member_name text;
begin
 select coalesce(display_name,'Medlem') into member_name from public.profiles where id=new.member_id;
 insert into public.notifications(recipient_id,title,body,category,href)
 select id,'Ny PT-førespurnad',member_name||' har bede om PT-time. Opna for å godkjenna eller avslå.','pt','pt-request:'||new.id::text
 from public.profiles where role in ('admin','manager') and active=true;
 return new;
end; $$;