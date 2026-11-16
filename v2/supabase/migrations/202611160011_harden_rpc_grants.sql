-- GarasjeGym 2.0: restrict sensitive SECURITY DEFINER RPC execution to signed-in members.
-- RLS policies and member flows use the authenticated role; anonymous callers do not.
revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.is_admin_or_manager() from public, anon;
grant execute on function public.is_admin_or_manager() to authenticated;

revoke all on function public.book_pt_session(uuid) from public, anon;
grant execute on function public.book_pt_session(uuid) to authenticated;
