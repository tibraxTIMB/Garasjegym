-- STURMKOPF FEUER 1.1 – production RLS privacy candidate.
-- REVIEW / ISOLATED REHEARSAL ONLY. Never apply to production without full
-- schema reconciliation, backup/restore proof, and reviewed staff/coach rules.
BEGIN;
DO $preflight$
BEGIN
  IF to_regclass('public.class_bookings') IS NULL OR to_regclass('public.pt_sessions') IS NULL THEN
    RAISE EXCEPTION 'Required production tables are missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.class_bookings'::regclass AND attname='member_id' AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.class_bookings'::regclass AND attname='status' AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.pt_sessions'::regclass AND attname='client_id' AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.pt_sessions'::regclass AND attname='status' AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Production table columns differ from reviewed policy contract';
  END IF;
END;
$preflight$;
DROP POLICY IF EXISTS class_bookings_read_own_or_staff ON public.class_bookings;
CREATE POLICY class_bookings_read_own_or_staff
ON public.class_bookings FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    member_id = (SELECT auth.uid())
    OR public.is_admin_or_manager()
  )
);
DROP POLICY IF EXISTS pt_sessions_read ON public.pt_sessions;
CREATE POLICY pt_sessions_read
ON public.pt_sessions FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    public.is_admin_or_manager()
    OR client_id = (SELECT auth.uid())
    OR (client_id IS NULL AND status = 'published')
  )
);
COMMIT;
