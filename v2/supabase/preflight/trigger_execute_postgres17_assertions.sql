\set ON_ERROR_STOP on

DO $assertions$
BEGIN
  IF has_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon retains EXECUTE on set_updated_at';
  END IF;
  IF has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated retains EXECUTE on set_updated_at';
  END IF;
  IF has_function_privilege('anon', 'public.guard_probe_insert()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon retains EXECUTE on guard_probe_insert';
  END IF;
  IF has_function_privilege('authenticated', 'public.guard_probe_insert()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated retains EXECUTE on guard_probe_insert';
  END IF;
END;
$assertions$;

-- Existing triggers must keep working after direct execution is revoked.
INSERT INTO public.trigger_probe(id, updated_at)
VALUES (1, '2000-01-01 00:00:00+00');

UPDATE public.trigger_probe
SET id = id
WHERE id = 1;

DO $assertions$
DECLARE
  observed_updated_at timestamptz;
BEGIN
  SELECT updated_at INTO observed_updated_at
  FROM public.trigger_probe
  WHERE id = 1;
  IF observed_updated_at <= '2000-01-01 00:00:00+00'::timestamptz THEN
    RAISE EXCEPTION 'existing trigger did not execute after EXECUTE revocation';
  END IF;
END;
$assertions$;
