CREATE OR REPLACE FUNCTION public.guard_class_capacity_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_active_bookings integer;
BEGIN
  IF NEW.capacity IS NOT DISTINCT FROM OLD.capacity THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
  INTO v_active_bookings
  FROM public.class_bookings b
  WHERE b.class_id = OLD.id
    AND b.status IN ('confirmed', 'pending');

  IF NEW.capacity < v_active_bookings THEN
    RAISE EXCEPTION
      'Kapasiteten kan ikkje setjast til % når % deltakarar alt er påmelde.',
      NEW.capacity, v_active_bookings;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_class_capacity_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_class_capacity_update() TO postgres, service_role;

DROP TRIGGER IF EXISTS classes_capacity_update_guard ON public.classes;
CREATE TRIGGER classes_capacity_update_guard
BEFORE UPDATE OF capacity ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.guard_class_capacity_update();
