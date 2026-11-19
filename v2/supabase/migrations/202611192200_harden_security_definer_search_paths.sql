-- Harden SECURITY DEFINER search paths in the isolated STURMKOPF test project.
-- pg_catalog is first; public remains available for qualified application objects;
-- pg_temp is last so temporary objects cannot shadow trusted names.
ALTER FUNCTION public.book_pt_session(uuid)
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.check_class_booking_capacity()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.create_pt_program_with_sessions(jsonb, jsonb)
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_class_attendance_counts(uuid[])
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_infotainment_schedule(timestamptz, timestamptz)
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.handle_new_auth_user()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.is_active_user()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.is_admin()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.is_admin_or_manager()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_coffee_order_ready()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_member_coffee_status()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_member_new_pt_session()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_member_pt_request_status()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_pt_message()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_staff_class_booking()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_staff_new_coffee_order()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_staff_new_pt_request()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_staff_pt_checkin()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.notify_staff_pt_intake()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.pt_promote_waitlist_after_cancel()
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.place_coffee_order(jsonb, text)
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.place_coffee_order_v2(jsonb, text, uuid)
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.skip_coffee_product_review(uuid)
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.submit_coffee_product_review(uuid, integer, text)
  SET search_path TO pg_catalog, public, pg_temp;
ALTER FUNCTION public.toggle_social_reaction(uuid, text)
  SET search_path TO pg_catalog, public, pg_temp;
