-- The canonical workout_log_id and unique partial indexes already cover this lookup.
DROP INDEX IF EXISTS public.idx_personal_records_workout_log_id;
