CREATE OR REPLACE FUNCTION public.guard_personal_record_workout_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_workout_member_id uuid;
BEGIN
  IF NEW.workout_log_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT wl.member_id
  INTO v_workout_member_id
  FROM public.workout_logs wl
  WHERE wl.id = NEW.workout_log_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Treningsloggen som PR-en viser til finst ikkje.';
  END IF;

  IF v_workout_member_id IS DISTINCT FROM NEW.member_id THEN
    RAISE EXCEPTION 'Ein personleg rekord kan berre knytast til di eiga treningsøkt.';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_personal_record_workout_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_personal_record_workout_owner() TO postgres, service_role;

DROP TRIGGER IF EXISTS personal_records_guard_workout_owner ON public.personal_records;
CREATE TRIGGER personal_records_guard_workout_owner
BEFORE INSERT OR UPDATE OF workout_log_id, member_id
ON public.personal_records
FOR EACH ROW
EXECUTE FUNCTION public.guard_personal_record_workout_owner();

-- One automatic PR of each exercise/unit can be stored for a workout log.
-- This makes retries and concurrent clients idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS personal_records_workout_exercise_unit_uidx
ON public.personal_records (workout_log_id, lower(exercise_name), unit)
WHERE workout_log_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_workout_prs(
  p_workout_id uuid,
  p_records jsonb
)
RETURNS TABLE(exercise_name text, result text, unit text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_workout_member_id uuid;
  v_workout_date date;
  v_item jsonb;
  v_exercise_name text;
  v_result_text text;
  v_result_value numeric;
  v_unit text;
  v_note text;
  v_level text;
  v_best numeric;
  v_inserted_exercise text;
  v_inserted_result text;
  v_inserted_unit text;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Aktiv medlemskonto krevst for å registrera PR.';
  END IF;

  IF p_workout_id IS NULL OR jsonb_typeof(p_records) <> 'array'
     OR jsonb_array_length(p_records) > 100 THEN
    RAISE EXCEPTION 'PR-data frå treningsøkta er ugyldige.';
  END IF;

  SELECT wl.member_id, wl.workout_date
  INTO v_workout_member_id, v_workout_date
  FROM public.workout_logs wl
  WHERE wl.id = p_workout_id
  FOR KEY SHARE;

  IF NOT FOUND OR v_workout_member_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Treningsøkta finst ikkje eller høyrer ikkje til deg.';
  END IF;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_records) AS items(value)
  LOOP
    IF NULLIF(v_item->>'member_id', '')::uuid IS DISTINCT FROM v_user_id
       OR NULLIF(v_item->>'workout_log_id', '')::uuid IS DISTINCT FROM p_workout_id THEN
      RAISE EXCEPTION 'PR-en må høyra til den innlogga brukaren og den lagra treningsøkta.';
    END IF;

    v_exercise_name := NULLIF(BTRIM(v_item->>'exercise_name'), '');
    v_result_text := NULLIF(BTRIM(v_item->>'result'), '');
    v_unit := NULLIF(BTRIM(v_item->>'unit'), '');
    v_note := COALESCE(v_item->>'note', '');

    IF v_exercise_name IS NULL
       OR v_result_text IS NULL
       OR v_unit NOT IN ('kg', 'cm', 'reps', 'sek', 'meter', 'cal')
       OR v_result_text !~ '^[+-]?([0-9]+([.,][0-9]*)?|[.,][0-9]+)$' THEN
      RAISE EXCEPTION 'PR-en for «%» har ugyldig resultat eller måleeining.', COALESCE(v_exercise_name, 'ukjend øving');
    END IF;

    v_result_value := REPLACE(v_result_text, ',', '.')::numeric;
    IF v_result_value <= 0 THEN
      RAISE EXCEPTION 'Ein PR må vera større enn null.';
    END IF;

    v_level := COALESCE(
      NULLIF(UPPER(SUBSTRING(v_note FROM '^(RX|SCALED|FOUNDATION)[[:space:]]*[·:-]')), ''),
      'RX'
    );

    -- Serialize comparisons for the same member/exercise/unit/prescription.
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        'garasjegym:pr:' || v_user_id::text || ':'
        || LOWER(v_exercise_name) || ':' || v_unit || ':' || v_level,
        0
      )
    );

    SELECT
      CASE WHEN v_unit = 'sek' THEN MIN(REPLACE(pr.result, ',', '.')::numeric)
           ELSE MAX(REPLACE(pr.result, ',', '.')::numeric)
      END
    INTO v_best
    FROM public.personal_records pr
    WHERE pr.member_id = v_user_id
      AND LOWER(pr.exercise_name) = LOWER(v_exercise_name)
      AND pr.unit = v_unit
      AND COALESCE(
        NULLIF(UPPER(SUBSTRING(COALESCE(pr.note, '') FROM '^(RX|SCALED|FOUNDATION)[[:space:]]*[·:-]')), ''),
        'RX'
      ) = v_level
      AND pr.result ~ '^[+-]?([0-9]+([.,][0-9]*)?|[.,][0-9]+)$';

    IF (v_unit = 'sek' AND (v_best IS NULL OR v_result_value < v_best))
       OR (v_unit <> 'sek' AND (v_best IS NULL OR v_result_value > v_best)) THEN
      INSERT INTO public.personal_records (
        member_id, workout_log_id, exercise_name, result, unit, record_date, note
      )
      VALUES (
        v_user_id, p_workout_id, v_exercise_name, v_result_text, v_unit,
        v_workout_date, v_note
      )
      ON CONFLICT DO NOTHING
      RETURNING personal_records.exercise_name, personal_records.result, personal_records.unit
      INTO v_inserted_exercise, v_inserted_result, v_inserted_unit;

      IF FOUND THEN
        exercise_name := v_inserted_exercise;
        result := v_inserted_result;
        unit := v_inserted_unit;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_workout_prs(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_workout_prs(uuid, jsonb) TO authenticated, service_role;
