-- STURMKOPF FEUER 1.1 – exercise catalogue integrity gate.
-- READ ONLY. Run against the restored/test database before any clean-start reset.
-- The canonical seeded catalogue must remain >= 90 rows; production currently
-- has 56 while the tested STURMKOPF database has 94.
DO $$
DECLARE
  seeded_count integer;
  missing_categories text[];
  duplicate_names integer;
BEGIN
  SELECT count(*) INTO seeded_count
  FROM public.exercises
  WHERE created_by IS NULL;

  IF seeded_count < 90 THEN
    RAISE EXCEPTION 'Exercise catalogue gate failed: expected at least 90 seeded exercises, found %', seeded_count;
  END IF;

  SELECT array_agg(required.category ORDER BY required.category)
  INTO missing_categories
  FROM (VALUES
    ('CrossFit'), ('Kjerne'), ('Kondisjon'),
    ('Mobilitet'), ('Rehab / fysio'), ('Styrke')
  ) AS required(category)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.exercises e
    WHERE e.created_by IS NULL
      AND lower(trim(e.category)) = lower(trim(required.category))
  );

  IF coalesce(array_length(missing_categories, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Exercise catalogue gate failed: missing seeded categories: %',
      array_to_string(missing_categories, ', ');
  END IF;

  SELECT count(*) INTO duplicate_names
  FROM (
    SELECT lower(trim(name))
    FROM public.exercises
    WHERE created_by IS NULL
    GROUP BY lower(trim(name))
    HAVING count(*) > 1
  ) duplicates;

  IF duplicate_names > 0 THEN
    RAISE EXCEPTION 'Exercise catalogue gate failed: % duplicate seeded exercise names', duplicate_names;
  END IF;

  RAISE NOTICE 'Exercise catalogue gate passed: % seeded exercises; all six required categories present; no duplicate seeded names.',
    seeded_count;
END $$;
