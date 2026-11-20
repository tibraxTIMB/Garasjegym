DROP POLICY IF EXISTS wod_favorites_read_own ON public.wod_favorites;
CREATE POLICY wod_favorites_read_own
ON public.wod_favorites FOR SELECT TO authenticated
USING (
  (public.is_active_user() AND user_id = (SELECT auth.uid()))
  OR public.is_admin_or_manager()
);

DROP POLICY IF EXISTS wod_favorites_delete_own ON public.wod_favorites;
CREATE POLICY wod_favorites_delete_own
ON public.wod_favorites FOR DELETE TO authenticated
USING (
  (public.is_active_user() AND user_id = (SELECT auth.uid()))
  OR public.is_admin_or_manager()
);

DROP POLICY IF EXISTS member_preferences_read_own ON public.member_preferences;
CREATE POLICY member_preferences_read_own
ON public.member_preferences FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS member_preferences_insert_own ON public.member_preferences;
CREATE POLICY member_preferences_insert_own
ON public.member_preferences FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS member_preferences_update_own ON public.member_preferences;
CREATE POLICY member_preferences_update_own
ON public.member_preferences FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND user_id = (SELECT auth.uid())
)
WITH CHECK (
  public.is_active_user()
  AND user_id = (SELECT auth.uid())
);
