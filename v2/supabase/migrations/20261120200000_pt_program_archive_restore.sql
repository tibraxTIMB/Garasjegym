-- Soft archive PT programmes and individual sessions. Archived content is
-- hidden from members, retained for staff, and can be restored without data loss.
ALTER TABLE public.pt_programs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.pt_program_sessions
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pt_programs_client_active_idx
  ON public.pt_programs(client_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS pt_program_sessions_program_active_idx
  ON public.pt_program_sessions(program_id, week_no, day_no, sequence_no)
  WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.archive_pt_program(p_program_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre aktiv PT-administrator kan arkivera program.';
  end if;
  if p_program_id is null then raise exception 'Program-ID manglar.'; end if;

  perform 1 from public.pt_programs where id=p_program_id for update;
  if not found then raise exception 'PT-programmet finst ikkje.'; end if;

  update public.pt_programs
    set archived_at=coalesce(archived_at,now()), archived_by=coalesce(archived_by,auth.uid()),
        status='archived', updated_at=now()
    where id=p_program_id;

  update public.pt_program_sessions
    set archived_at=coalesce(archived_at,now()), archived_by=coalesce(archived_by,auth.uid()),
        updated_at=now()
    where program_id=p_program_id and archived_at is null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.restore_pt_program(p_program_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre aktiv PT-administrator kan gjenoppretta program.';
  end if;
  if p_program_id is null then raise exception 'Program-ID manglar.'; end if;

  perform 1 from public.pt_programs where id=p_program_id for update;
  if not found then raise exception 'PT-programmet finst ikkje.'; end if;

  update public.pt_programs
    set archived_at=null, archived_by=null, status='active', updated_at=now()
    where id=p_program_id;

  update public.pt_program_sessions
    set archived_at=null, archived_by=null, updated_at=now()
    where program_id=p_program_id and archived_at is not null
      and archived_by=(select archived_by from public.pt_programs where id=p_program_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.archive_pt_program_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
declare v_program_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre aktiv PT-administrator kan arkivera programøkter.';
  end if;
  select program_id into v_program_id from public.pt_program_sessions where id=p_session_id for update;
  if v_program_id is null then raise exception 'PT-økta finst ikkje.'; end if;
  perform 1 from public.pt_programs where id=v_program_id and archived_at is null for update;
  if not found then raise exception 'Programmet er arkivert.'; end if;
  update public.pt_program_sessions
    set archived_at=now(), archived_by=auth.uid(), updated_at=now()
    where id=p_session_id and archived_at is null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.restore_pt_program_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
declare v_program_id uuid;
begin
  if auth.uid() is null or not public.is_active_user() or not public.is_admin_or_manager() then
    raise exception 'Berre aktiv PT-administrator kan gjenoppretta programøkter.';
  end if;
  select program_id into v_program_id from public.pt_program_sessions where id=p_session_id for update;
  if v_program_id is null then raise exception 'PT-økta finst ikkje.'; end if;
  perform 1 from public.pt_programs where id=v_program_id and archived_at is null for update;
  if not found then raise exception 'Gjenopprett programmet før du gjenopprettar økta.'; end if;
  update public.pt_program_sessions set archived_at=null, archived_by=null, updated_at=now()
    where id=p_session_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_pt_session_archive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog','public'
AS $function$
begin
  if not public.is_admin_or_manager()
     and (new.archived_at is distinct from old.archived_at
       or new.archived_by is distinct from old.archived_by) then
    raise exception 'Medlem kan ikkje arkivera eller gjenoppretta PT-økter.';
  end if;
  return new;
end;
$function$;

DROP TRIGGER IF EXISTS pt_session_archive_guard ON public.pt_program_sessions;
CREATE TRIGGER pt_session_archive_guard
  BEFORE UPDATE ON public.pt_program_sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_pt_session_archive_fields();

-- Members can only see live programmes and sessions. Staff retain archive access.
DROP POLICY IF EXISTS pt_programs_read_own_or_staff ON public.pt_programs;
CREATE POLICY pt_programs_read_own_or_staff
ON public.pt_programs FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager()
  OR (client_id=(SELECT auth.uid()) AND archived_at IS NULL)
);

DROP POLICY IF EXISTS pt_program_sessions_read_parent ON public.pt_program_sessions;
CREATE POLICY pt_program_sessions_read_parent
ON public.pt_program_sessions FOR SELECT TO authenticated
USING (
  public.is_admin_or_manager()
  OR (
    archived_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.pt_programs p
      WHERE p.id=pt_program_sessions.program_id
        AND p.client_id=(SELECT auth.uid())
        AND p.archived_at IS NULL
    )
  )
);

REVOKE ALL ON FUNCTION public.archive_pt_program(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_pt_program(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_pt_program_session(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_pt_program_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_pt_program(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_pt_program(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_pt_program_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_pt_program_session(uuid) TO authenticated;
