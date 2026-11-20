CREATE INDEX IF NOT EXISTS pt_programs_archived_by_idx ON public.pt_programs(archived_by) WHERE archived_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS pt_program_sessions_archived_by_idx ON public.pt_program_sessions(archived_by) WHERE archived_by IS NOT NULL;
