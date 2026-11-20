DROP TRIGGER IF EXISTS pt_program_session_member_update_guard ON public.pt_program_sessions;
DROP FUNCTION IF EXISTS public.guard_pt_program_session_member_update();
