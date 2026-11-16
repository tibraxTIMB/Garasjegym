-- Trigger-only SECURITY DEFINER functions must not be exposed as callable RPCs.
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.pt_promote_waitlist_after_cancel() from public, anon, authenticated;
