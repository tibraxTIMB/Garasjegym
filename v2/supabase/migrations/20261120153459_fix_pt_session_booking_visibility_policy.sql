CREATE OR REPLACE FUNCTION app_private.has_own_pt_session_booking(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.pt_bookings b
      WHERE b.session_id = p_session_id
        AND b.member_id = (SELECT auth.uid())
    );
$function$;

REVOKE ALL ON FUNCTION app_private.has_own_pt_session_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_own_pt_session_booking(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS pt_sessions_read ON public.pt_sessions;
CREATE POLICY pt_sessions_read
ON public.pt_sessions
FOR SELECT
TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR client_id = (SELECT auth.uid())
    OR status = 'published'
    OR (
      client_id IS NOT NULL
      AND app_private.is_pt_coach_for_member(client_id)
    )
    OR app_private.has_own_pt_session_booking(id)
  )
);
