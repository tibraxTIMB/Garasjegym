-- Do not send staff PT notifications to accounts whose membership is
-- active at the profile level but has not been approved.
CREATE OR REPLACE FUNCTION public.notify_staff_new_pt_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  member_name text;
begin
  select coalesce(display_name,'Medlem')
    into member_name
  from public.profiles
  where id = new.member_id;

  insert into public.notifications(
    recipient_id,title,body,category,href,priority,requires_action,dedupe_key
  )
  select id,
    'Ny PT-førespurnad',
    member_name || ' har bede om PT-time. Opna førespurnaden og følg opp.',
    'pt',
    'pt-request:' || new.id::text,
    'high',
    true,
    'pt-request:' || new.id::text
  from public.profiles
  where role in ('admin','manager')
    and active = true
    and membership_status = 'approved'
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;

  return new;
end;
$function$;
