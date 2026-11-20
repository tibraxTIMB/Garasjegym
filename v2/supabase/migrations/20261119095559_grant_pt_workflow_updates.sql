-- The RLS policies and row guards already define who may update these rows.
-- The missing table-level UPDATE grants prevented both staff and member workflows.
grant update on table public.pt_program_sessions to authenticated;
grant update on table public.pt_checkins to authenticated;
