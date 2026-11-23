-- GG-026: Fjern sikre namn-dublettar, bevar eigne rørslevariantar og treningshistorikk.
-- Køyrer idempotent. Avbryt om ei oppføring har aktive WOD-/logg-/PR-referansar.
DO $gg026$
DECLARE
  pair record;
  obsolete_id uuid;
  deleted_count integer;
BEGIN
  FOR pair IN
    SELECT * FROM (VALUES
      ('Kettlebell Deadlift / Markløft', 'Kettlebell markløft'),
      ('Bent-over row', 'Barbell Row'),
      ('Dumbbell row', 'One-arm Dumbbell Row'),
      ('Incline Dumbbell Press', 'Incline bench press – manualar')
    ) AS pairs(obsolete_name, keep_name)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.exercises WHERE name = pair.keep_name) THEN
      RAISE EXCEPTION 'GG-026: manglar kanonisk øving: %', pair.keep_name;
    END IF;
    SELECT id INTO obsolete_id FROM public.exercises WHERE name = pair.obsolete_name;
    IF obsolete_id IS NULL THEN
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM public.workout_exercises WHERE exercise_id = obsolete_id OR exercise_name = pair.obsolete_name)
       OR EXISTS (SELECT 1 FROM public.personal_records WHERE exercise_name = pair.obsolete_name)
       OR EXISTS (SELECT 1 FROM public.pt_session_exercises WHERE exercise_name = pair.obsolete_name)
       OR EXISTS (SELECT 1 FROM public.exercise_favorites WHERE exercise_name = pair.obsolete_name)
       OR EXISTS (
         SELECT 1 FROM public.wods
         WHERE timer_settings::text ILIKE '%' || obsolete_id::text || '%'
            OR timer_settings::text ILIKE '%' || pair.obsolete_name || '%'
            OR movements ILIKE '%' || pair.obsolete_name || '%'
       )
    THEN
      RAISE EXCEPTION 'GG-026: kan ikkje fjerne %, øvinga er referert av lagra data', pair.obsolete_name;
    END IF;
    DELETE FROM public.exercises WHERE id = obsolete_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count <> 1 THEN
      RAISE EXCEPTION 'GG-026: venta å fjerna éi rad for %, fekk %',pair.obsolete_name,deleted_count;
    END IF;
  END LOOP;
  -- Bevar ID-en brukt av den eksisterande WOD-en og gjer øvinga valbar igjen.
  UPDATE public.exercises
  SET is_active = true, updated_at = now()
  WHERE name = 'Kettlebell markløft' AND is_active = false;
END;
$gg026$;
