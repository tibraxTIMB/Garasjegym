-- Remove the legacy equivalent partial index before keeping the canonical name.
drop index if exists public.class_bookings_one_active;

-- Cover foreign keys used in joins, deletes and policy checks.
create index if not exists challenges_created_by_idx on public.challenges(created_by);
create index if not exists class_bookings_member_id_idx on public.class_bookings(member_id);
create index if not exists class_live_sessions_started_by_idx on public.class_live_sessions(started_by);
create index if not exists class_live_sessions_wod_id_idx on public.class_live_sessions(wod_id);
create index if not exists classes_created_by_idx on public.classes(created_by);
create index if not exists coffee_order_items_order_id_idx on public.coffee_order_items(order_id);
create index if not exists coffee_order_items_product_id_idx on public.coffee_order_items(product_id);
create index if not exists coffee_orders_member_id_idx on public.coffee_orders(member_id);
create index if not exists exercises_created_by_idx on public.exercises(created_by);
create index if not exists personal_records_member_id_idx on public.personal_records(member_id);
create index if not exists pt_client_notes_coach_id_idx on public.pt_client_notes(coach_id);
create index if not exists pt_messages_sender_id_idx on public.pt_messages(sender_id);
create index if not exists pt_requests_handled_by_idx on public.pt_requests(handled_by);
create index if not exists pt_sessions_created_by_idx on public.pt_sessions(created_by);
create index if not exists pt_sessions_workout_log_id_idx on public.pt_sessions(workout_log_id);
create index if not exists social_comments_author_id_idx on public.social_comments(author_id);
create index if not exists social_posts_author_id_idx on public.social_posts(author_id);
create index if not exists wods_created_by_idx on public.wods(created_by);
create index if not exists workout_exercises_exercise_id_idx on public.workout_exercises(exercise_id);
create index if not exists workout_logs_source_wod_id_idx on public.workout_logs(source_wod_id);
