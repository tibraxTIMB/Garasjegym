-- Remove the duplicate index created by the early PT/group-booking QA pass.
-- The canonical partial unique index was already installed by 202611191340.
drop index if exists public.class_bookings_one_active_per_member_idx;

-- Add the 19 foreign-key indexes reported by the Supabase performance advisor.
-- They support joins and parent-row updates/deletes without changing stored data.
create index if not exists coffee_product_reviews_order_id_fk_idx
  on public.coffee_product_reviews(order_id);
create index if not exists coffee_settings_updated_by_fk_idx
  on public.coffee_settings(updated_by);
create index if not exists daily_wod_set_by_fk_idx
  on public.daily_wod(set_by);
create index if not exists daily_wod_wod_id_fk_idx
  on public.daily_wod(wod_id);
create index if not exists pt_client_assignments_assigned_by_fk_idx
  on public.pt_client_assignments(assigned_by);
create index if not exists pt_coaches_created_by_fk_idx
  on public.pt_coaches(created_by);
create index if not exists pt_service_requests_assigned_coach_id_fk_idx
  on public.pt_service_requests(assigned_coach_id);
create index if not exists pt_service_requests_handled_by_fk_idx
  on public.pt_service_requests(handled_by);
create index if not exists pt_service_requests_service_id_fk_idx
  on public.pt_service_requests(service_id);
create index if not exists pt_services_created_by_fk_idx
  on public.pt_services(created_by);
create index if not exists pt_wod_assignments_assigned_by_fk_idx
  on public.pt_wod_assignments(assigned_by);
create index if not exists pt_wod_assignments_wod_id_fk_idx
  on public.pt_wod_assignments(wod_id);
create index if not exists pt_wod_assignments_workout_log_id_fk_idx
  on public.pt_wod_assignments(workout_log_id);
create index if not exists training_session_wods_wod_id_fk_idx
  on public.training_session_wods(wod_id);
create index if not exists training_sessions_created_by_fk_idx
  on public.training_sessions(created_by);
create index if not exists training_sessions_member_id_fk_idx
  on public.training_sessions(member_id);
create index if not exists wod_daily_schedules_created_by_fk_idx
  on public.wod_daily_schedules(created_by);
create index if not exists wod_daily_schedules_target_class_id_fk_idx
  on public.wod_daily_schedules(target_class_id);
create index if not exists wod_favorites_wod_id_fk_idx
  on public.wod_favorites(wod_id);
