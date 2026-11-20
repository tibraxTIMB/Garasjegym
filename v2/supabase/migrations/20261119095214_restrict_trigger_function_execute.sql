-- Trigger entry points are not public RPC APIs. Trigger execution does not
-- require callers to retain EXECUTE on the trigger function after CREATE TRIGGER.
-- Keep EXECUTE for the owner/service role and revoke client-facing roles.

alter function public.set_notification_read_at() set search_path = pg_catalog, public;

revoke all on function public.notify_member_coffee_status() from public, anon, authenticated;
revoke all on function public.notify_member_new_pt_session() from public, anon, authenticated;
revoke all on function public.notify_member_pt_request_status() from public, anon, authenticated;
revoke all on function public.notify_pt_message() from public, anon, authenticated;
revoke all on function public.notify_staff_class_booking() from public, anon, authenticated;
revoke all on function public.notify_staff_new_coffee_order() from public, anon, authenticated;
revoke all on function public.notify_staff_new_pt_request() from public, anon, authenticated;
revoke all on function public.notify_staff_pt_checkin() from public, anon, authenticated;
revoke all on function public.notify_staff_pt_intake() from public, anon, authenticated;
revoke all on function public.set_notification_read_at() from public, anon, authenticated;
