-- Trigger functions are not public RPC APIs. PostgreSQL checks EXECUTE when a
-- trigger is created; existing triggers continue to invoke their bound function.
-- Revoke client-facing execution from every public-schema function that is
-- attached to a non-internal public-table trigger. This also covers future
-- trigger functions without maintaining a fragile hand-written list.
DO $migration$
DECLARE
  trigger_function record;
BEGIN
  FOR trigger_function IN
    SELECT DISTINCT
      function_namespace.nspname AS schema_name,
      function_proc.proname AS function_name,
      pg_get_function_identity_arguments(function_proc.oid) AS identity_arguments
    FROM pg_trigger trigger_row
    JOIN pg_class trigger_table
      ON trigger_table.oid = trigger_row.tgrelid
    JOIN pg_namespace table_namespace
      ON table_namespace.oid = trigger_table.relnamespace
    JOIN pg_proc function_proc
      ON function_proc.oid = trigger_row.tgfoid
    JOIN pg_namespace function_namespace
      ON function_namespace.oid = function_proc.pronamespace
    WHERE NOT trigger_row.tgisinternal
      AND table_namespace.nspname = 'public'
      AND function_namespace.nspname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      trigger_function.schema_name,
      trigger_function.function_name,
      trigger_function.identity_arguments
    );
  END LOOP;
END;
$migration$;
