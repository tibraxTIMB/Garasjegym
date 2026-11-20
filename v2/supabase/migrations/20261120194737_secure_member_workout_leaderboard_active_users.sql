CREATE OR REPLACE FUNCTION public.get_member_workout_leaderboard()
RETURNS TABLE(member_id uuid, display_name text, workout_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT
    p.id AS member_id,
    COALESCE(NULLIF(BTRIM(p.display_name), ''), 'Medlem') AS display_name,
    COUNT(wl.id)::bigint AS workout_count
  FROM public.profiles p
  LEFT JOIN public.workout_logs wl ON wl.member_id = p.id
  WHERE public.is_active_user()
    AND p.active IS TRUE
    AND p.role = 'member'
    AND p.membership_status = 'approved'
  GROUP BY p.id, p.display_name
  ORDER BY COUNT(wl.id) DESC, COALESCE(NULLIF(BTRIM(p.display_name), ''), 'Medlem') ASC
  LIMIT 500;
$function$;

REVOKE ALL ON FUNCTION public.get_member_workout_leaderboard() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_member_workout_leaderboard() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_member_workout_leaderboard() TO authenticated;
