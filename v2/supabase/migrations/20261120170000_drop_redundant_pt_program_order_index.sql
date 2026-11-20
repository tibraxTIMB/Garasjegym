-- The unique index on (program_id, sequence_no) already supports the
-- same ordered lookups. This non-unique duplicate adds write/storage cost.
DROP INDEX IF EXISTS public.pt_program_sessions_program_order_idx;
