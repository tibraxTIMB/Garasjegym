CREATE OR REPLACE FUNCTION public.get_infotainment_schedule(
  p_from timestamp with time zone,
  p_to timestamp with time zone
)
RETURNS TABLE(
  event_key text,
  category text,
  title text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Aktiv innlogging er kravd for garasjeskjermen.';
  END IF;

  IF p_from IS NULL OR p_to IS NULL
     OR p_to <= p_from
     OR p_to - p_from > interval '31 days' THEN
    RAISE EXCEPTION 'Ugyldig tidsperiode.';
  END IF;

  RETURN QUERY
  WITH events AS (
    SELECT
      'class'::text AS category,
      c.title,
      c.starts_at,
      c.starts_at + make_interval(mins => greatest(1, c.duration_minutes)) AS ends_at
    FROM public.classes c
    WHERE c.published = true
      AND c.cancelled_at IS NULL
      -- Include a class already in progress at the beginning of the window.
      AND c.starts_at < p_to
      AND c.starts_at + make_interval(mins => greatest(1, c.duration_minutes)) >= p_from

    UNION ALL

    -- Public PT timetable entries are unassigned slots only. Client-linked
    -- appointments remain private and must never appear on the shared display.
    SELECT
      'pt'::text AS category,
      'PT-time'::text AS title,
      s.starts_at,
      s.starts_at + make_interval(mins => greatest(1, s.duration_minutes)) AS ends_at
    FROM public.pt_sessions s
    WHERE s.client_id IS NULL
      AND s.status = 'published'
      AND s.starts_at < p_to
      AND s.starts_at + make_interval(mins => greatest(1, s.duration_minutes)) >= p_from
  )
  SELECT
    'event-' || row_number() OVER (ORDER BY e.starts_at, e.category)::text,
    e.category,
    e.title,
    e.starts_at,
    e.ends_at
  FROM events e
  ORDER BY e.starts_at, e.category;
END;
$function$;
