-- Atomically append a WOD to a class without overwriting another coach's update.
CREATE OR REPLACE FUNCTION public.add_wod_to_class(
  p_class_id uuid,
  p_wod_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_wod_ids jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin_or_manager() THEN
    RAISE EXCEPTION 'Berre administrator eller dagleg leiar kan endra gruppetimar.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.wods
    WHERE id = p_wod_id AND COALESCE(is_archived, false) = false
  ) THEN
    RAISE EXCEPTION 'WOD-en finst ikkje lenger eller er arkivert.';
  END IF;

  UPDATE public.classes
  SET wod_ids = CASE
    WHEN COALESCE(wod_ids, '[]'::jsonb) @> jsonb_build_array(p_wod_id::text)
      THEN COALESCE(wod_ids, '[]'::jsonb)
    ELSE COALESCE(wod_ids, '[]'::jsonb) || jsonb_build_array(p_wod_id::text)
  END
  WHERE id = p_class_id
    AND published = true
    AND cancelled_at IS NULL
    AND starts_at > pg_catalog.now()
  RETURNING wod_ids INTO v_wod_ids;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gruppetimen finst ikkje, er avlyst eller har starta.';
  END IF;

  RETURN v_wod_ids;
END;
$function$;

REVOKE ALL ON FUNCTION public.add_wod_to_class(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_wod_to_class(uuid, uuid) TO authenticated;
