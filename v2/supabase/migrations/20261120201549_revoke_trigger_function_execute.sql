-- Trigger-only integrity function; never expose it as an RPC endpoint.
revoke all on function public.guard_completed_pt_assignment_workout_link()
from public, anon, authenticated;
