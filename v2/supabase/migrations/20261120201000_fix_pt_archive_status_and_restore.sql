-- Preserve the constrained lifecycle status; archived_at is the archive state.
CREATE OR REPLACE FUNCTION public.archive_pt_program(p_program_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
declare v_archived_at timestamptz;
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre aktiv PT-administrator kan arkivera program.';
  end if;
  if p_program_id is null then raise exception 'Program-ID manglar.'; end if;
  select archived_at into v_archived_at from public.pt_programs where id=p_program_id for update;
  if not found then raise exception 'PT-programmet finst ikkje.'; end if;
  v_archived_at := coalesce(v_archived_at,now());
  update public.pt_programs set archived_at=v_archived_at, archived_by=coalesce(archived_by,auth.uid()), updated_at=now()
    where id=p_program_id;
  update public.pt_program_sessions
    set archived_at=v_archived_at, archived_by=auth.uid(), updated_at=now()
    where program_id=p_program_id and archived_at is null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.restore_pt_program(p_program_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
declare v_archived_at timestamptz;
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre aktiv PT-administrator kan gjenoppretta program.';
  end if;
  select archived_at into v_archived_at from public.pt_programs where id=p_program_id for update;
  if not found then raise exception 'PT-programmet finst ikkje.'; end if;
  if v_archived_at is null then raise exception 'PT-programmet er ikkje arkivert.'; end if;
  update public.pt_programs set archived_at=null, archived_by=null, updated_at=now() where id=p_program_id;
  update public.pt_program_sessions set archived_at=null, archived_by=null, updated_at=now()
    where program_id=p_program_id and archived_at=v_archived_at;
end;
$function$;
