-- GG-011: Resultatvarsling opnar korrekt gruppetime.
-- Bruk eksisterande varselmekanisme og bevar resultatstatus.
CREATE OR REPLACE FUNCTION public.publish_class_session_results(p_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_session public.class_live_sessions%rowtype;
  v_count integer := 0;
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre instruktør kan publisera gruppetime-WOD-ar.';
  end if;

  select * into v_session
  from public.class_live_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Gruppetreninga finst ikkje.';
  end if;
  if v_session.status <> 'finished' then
    raise exception 'Gruppetreninga må avsluttast før WOD-ane kan publiserast.';
  end if;
  if v_session.results_published_at is not null then
    return 0;
  end if;

  insert into public.notifications(recipient_id,title,body,category,href)
  select b.member_id,
         'Resultat frå gruppetimen er klart',
         v_session.session_title || ' – registrer resultat frå gruppetimen.',
         'booking',
         'group-class:' || v_session.class_id::text
  from public.class_bookings b
  where b.class_id = v_session.class_id
    and b.status = 'confirmed';

  get diagnostics v_count = row_count;

  update public.class_live_sessions
  set results_published_at = now()
  where id = p_session_id;

  return v_count;
end;
$function$
;
