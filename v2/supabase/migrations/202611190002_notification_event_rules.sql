create or replace function public.notify_staff_new_pt_request()
returns trigger language plpgsql security definer set search_path=public as $$
declare member_name text;
begin
 select coalesce(display_name,'Medlem') into member_name from public.profiles where id=new.member_id;
 insert into public.notifications(recipient_id,title,body,category,href,priority,requires_action,dedupe_key)
 select id,'Ny PT-førespurnad',member_name||' har bede om PT-time. Opna førespurnaden og følg opp.','pt','pt-request:'||new.id::text,'high',true,'pt-request:'||new.id::text
 from public.profiles where role in ('admin','manager') and active=true
 on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
 return new;
end; $$;

create or replace function public.notify_member_pt_request_status()
returns trigger language plpgsql security definer set search_path=public as $$
declare status_label text;
begin
 if new.status is distinct from old.status and new.status in ('approved','declined','cancelled') then
  status_label:=case new.status when 'approved' then 'Godkjend' when 'declined' then 'Avslått' else 'Avlyst' end;
  insert into public.notifications(recipient_id,title,body,category,href,priority,requires_action)
  values(new.member_id,'PT-førespurnaden er oppdatert','Status: '||status_label||'.','pt','pt','normal',false);
 end if;
 return new;
end; $$;

create or replace function public.notify_member_new_pt_session()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.client_id is not null then
  insert into public.notifications(recipient_id,title,body,category,href,priority,requires_ack,expires_at,dedupe_key)
  values(new.client_id,'Ny PT-time er oppretta',coalesce(new.title,'PT-time')||' er lagd til i PT-studioet ditt. Opna PT-oppfølginga for detaljar.','pt','pt-studio','high',true,new.starts_at,'pt-session:'||new.id::text)
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
 end if;
 return new;
end; $$;

create or replace function public.notify_staff_new_coffee_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare customer_name text;
begin
 select coalesce(display_name,'Medlem') into customer_name from public.profiles where id=new.member_id;
 insert into public.notifications(recipient_id,title,body,category,href,priority,requires_action,dedupe_key)
 select id,'Ny kaffibestilling',customer_name||' har sendt ei bestilling. Gå til kaffibaren og oppdater status.','coffee','kaffi','high',true,'coffee-order:'||new.id::text
 from public.profiles where role in ('admin','manager') and active=true
 on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
 return new;
end; $$;

create or replace function public.notify_member_coffee_status()
returns trigger language plpgsql security definer set search_path=public as $$
declare status_label text;
begin
 if new.status is distinct from old.status then
  status_label:=case new.status when 'preparing' then 'I produksjon' when 'ready' then 'Ferdig – klar for henting' when 'collected' then 'Henta' when 'cancelled' then 'Avbroten' else new.status end;
  insert into public.notifications(recipient_id,title,body,category,href,priority,requires_action)
  values(new.member_id,'Oppdatert kaffibestilling','Bestillinga di er no: '||status_label||'.','coffee','kaffi',case when new.status='ready' then 'high' else 'normal' end,false);
 end if;
 return new;
end; $$;

create or replace function public.notify_staff_pt_intake()
returns trigger language plpgsql security definer set search_path=public as $$
declare member_name text;
begin
 select coalesce(display_name,'Medlem') into member_name from public.profiles where id=new.member_id;
 insert into public.notifications(recipient_id,title,body,category,href,priority,requires_action,dedupe_key)
 select id,'Ny PT-innmelding',member_name||' har sendt inn treningsmål og ønskje om PT-oppfølging. Gå gjennom innmeldinga.','pt','pt-client:'||new.member_id::text,'high',true,'pt-intake:'||new.id::text
 from public.profiles where role in ('admin','manager') and active=true
 on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
 return new;
end; $$;

drop trigger if exists pt_intake_notify_staff on public.pt_intakes;
create trigger pt_intake_notify_staff after insert on public.pt_intakes for each row execute function public.notify_staff_pt_intake();

create or replace function public.notify_staff_pt_checkin()
returns trigger language plpgsql security definer set search_path=public as $$
declare member_name text;
begin
 if new.status='submitted' and old.status is distinct from new.status then
  select coalesce(display_name,'Medlem') into member_name from public.profiles where id=new.member_id;
  insert into public.notifications(recipient_id,title,body,category,href,priority,requires_action,dedupe_key)
  select id,'PT-status mottatt',member_name||' har svart på «'||coalesce(new.title,'statusoppfølging')||'». Gå gjennom svara i PT-studioet.','pt','pt-client:'||new.member_id::text,'high',true,'pt-checkin:'||new.id::text
  from public.profiles where role in ('admin','manager') and active=true
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
 end if;
 return new;
end; $$;

drop trigger if exists pt_checkin_notify_staff on public.pt_checkins;
create trigger pt_checkin_notify_staff after update of status on public.pt_checkins for each row execute function public.notify_staff_pt_checkin();

create or replace function public.notify_staff_class_booking()
returns trigger language plpgsql security definer set search_path=public as $$
declare member_name text; class_name text; instructor uuid;
begin
 select coalesce(display_name,'Medlem') into member_name from public.profiles where id=new.member_id;
 select title,instructor_id into class_name,instructor from public.classes where id=new.class_id;
 if new.status='confirmed' and (tg_op='INSERT' or old.status is distinct from new.status) then
  insert into public.notifications(recipient_id,title,body,category,href,priority,requires_action,dedupe_key)
  select target_id,'Ny påmelding til gruppetime',member_name||' er påmeld '||coalesce(class_name,'gruppetimen')||'.','group','group-class:'||new.class_id::text,'normal',false,'class-booking:'||new.id::text||':'||new.status
  from (select id as target_id from public.profiles where role in ('admin','manager') and active=true union select instructor where instructor is not null) targets
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
 end if;
 return new;
end; $$;

drop trigger if exists class_booking_notify_staff on public.class_bookings;
create trigger class_booking_notify_staff after insert or update of status on public.class_bookings for each row execute function public.notify_staff_class_booking();
