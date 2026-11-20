-- Ensure PR source links are nullable and detached automatically when a workout is deleted.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.personal_records'::regclass
      AND conname = 'personal_records_workout_log_id_fkey'
  ) THEN
    ALTER TABLE public.personal_records
      ADD CONSTRAINT personal_records_workout_log_id_fkey
      FOREIGN KEY (workout_log_id)
      REFERENCES public.workout_logs(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;
