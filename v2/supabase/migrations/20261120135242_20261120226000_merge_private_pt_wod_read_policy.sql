DO $migration$
DECLARE
  v_existing_qual text;
BEGIN
  SELECT qual INTO v_existing_qual
  FROM pg_policies
  WHERE schemaname='public'
    AND tablename='wods'
    AND policyname='wods_read_combined'
    AND cmd='SELECT';

  IF v_existing_qual IS NULL THEN
    RAISE EXCEPTION 'Expected WOD read policy was not found; refusing to replace it.';
  END IF;

  DROP POLICY IF EXISTS wods_read_combined ON public.wods;
  DROP POLICY IF EXISTS wods_read_own_pt_library ON public.wods;

  EXECUTE format(
    'CREATE POLICY wods_read_combined ON public.wods FOR SELECT TO authenticated USING ((%s) OR (created_by=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.pt_coaches c JOIN public.profiles p ON p.id=c.user_id WHERE c.user_id=(SELECT auth.uid()) AND c.is_active=true AND p.role=''member'' AND p.active=true AND p.membership_status=''approved'')))',
    v_existing_qual
  );
END
$migration$;
