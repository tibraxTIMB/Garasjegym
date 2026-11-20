# GO LIVE Phase B62 – complete app-to-production contract audit
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Branch:** `garasjegym-2.0-sturm­kopf`  
**Head before this report:** `1a2c0d10f9446c7d27132879d54a7921e3f36fe0`

## 1. Summary
The current production Supabase project is not the schema that the current SturmKopf app expects.

Read-only catalog results:
- Production: 18 public base tables (plus the `pt_session_capacity` view).
- TEST: 46 public tables (plus the `pt_session_capacity` view).
- Production profile columns: `id, display_name, avatar_url, role, active, created_at, updated_at`.
- TEST profile columns: the above plus `email, membership_status, member_rank`.
- Production Edge Functions: only `garasjegym-music`.
- TEST Edge Functions: `admin-create-user`, `admin-delete-user`.
- Production migration ledger: 11 entries.
- TEST migration ledger: 164 entries.

A clean start for user data does not fix these structural incompatibilities.

## 2. App table dependencies absent from production
Source inspection of current v2 components found the app directly queries the following tables which do not exist in the current production public schema:

- `calendar_events`
- `challenge_participants`
- `challenges`
- `class_live_sessions`
- `class_session_wod_completions`
- `coffee_order_items`
- `coffee_orders`
- `coffee_product_reviews`
- `coffee_products`
- `coffee_settings`
- `daily_wod`
- `exercise_favorites`
- `notifications`
- `pt_checkins`
- `pt_client_assignments`
- `pt_client_goals`
- `pt_coaches`
- `pt_intakes`
- `pt_program_sessions`
- `pt_program_templates`
- `pt_programs`
- `pt_service_requests`
- `pt_services`
- `pt_wod_assignments`
- `training_session_wods`
- `wod_daily_schedules`
- `wod_favorites`

This list is based on literal Supabase `.from(...)` calls in v2 components and the live production table catalogue. Several modules depend on multiple absent tables, including Booking/Calendar, Challenges, CoffeeBar, Notifications, MyPage/MyTraining, PT Management, PT Studio, Training and WOD Library.

## 3. App RPC dependencies absent from production
Current v2 source calls RPCs that are not present in the live production public function catalogue, including:

- `add_wod_to_class`
- `archive_pt_program`
- `archive_pt_program_session`
- `assign_pt_coach`
- `book_class`
- `cancel_class`
- `cancel_pt_booking`
- `cancel_pt_session`
- `create_pt_program_with_sessions`
- `create_pt_session_from_request`
- `create_training_session_with_wods`
- `get_class_attendance_counts`
- `get_coffee_stats`
- `get_member_workout_leaderboard`
- `move_pt_program_session`
- `place_coffee_order_v2`
- `publish_class_session_results`
- `record_workout_prs`
- `reorder_pt_program_sessions`
- `restore_pt_program`
- `restore_pt_program_session`
- `save_wod_with_pt_assignment`
- `save_workout_with_pt_links`
- `skip_coffee_product_review`
- `submit_coffee_product_review`
- `toggle_social_reaction`
- `update_pt_session_details`

The production catalogue currently includes only eight public functions: `book_pt_session`, `check_class_booking_capacity`, `handle_new_auth_user`, `is_active_user`, `is_admin`, `is_admin_or_manager`, `pt_promote_waitlist_after_cancel`, and `set_updated_at`. This confirms that large parts of the current application cannot work against production as configured.

## 4. Edge Function mismatch
Production exposes only `garasjegym-music`. TEST exposes `admin-create-user` and `admin-delete-user`, but these are not deployed in production. The repository's current `admin-create-user` source returns HTTP 410 (disabled), so it is not a viable onboarding/bootstrap function. The current `admin-delete-user` source assumes a broader schema than production currently has and must not be deployed unchanged.

## 5. Security and migration implications
- Do not attempt to "fix" this by merely adding `email` and `membership_status` to `profiles`; the missing tables, RPCs, RLS policies, triggers, indexes and storage/config dependencies must be treated as one coherent schema contract.
- Do not replay the 164 TEST ledger entries against production. It includes a TEST baseline, seed data, and first-signup bootstrap, and the live production ledger is a different history.
- Do not assume a clean data reset means dropping the current production schema is safe.
- First-admin bootstrap, Auth identities, and role/membership gates must be tested on an isolated restored target before any live reset or deployment.

## 6. Recommended release strategy
Given the extent of drift, treat production as a separate controlled schema migration project:
1. Freeze the exact release commit and define a production-only schema manifest from the v2 application contract.
2. Recover the actual production schema and all necessary dependencies in an isolated target; use a supported encrypted backup/restore route.
3. Build a reconciled migration chain that is clean-installable from a blank database and separately upgrades the current production schema. Clearly distinguish new baseline from historical migration provenance.
4. Reconcile every app table, column, constraint, index, RLS policy, function, trigger, grant, storage bucket/policy and Edge Function.
5. Implement and verify secure first-admin bootstrap and member signup/approval lifecycle.
6. Run app-level acceptance tests against the isolated production-shaped database: profile/auth, member home, WOD Builder, training save, PR, PT Studio, bookings, class timer/results, calendar, notifications, coffee, community, music and admin.
7. Only after successful restore rehearsal, owner-approved reset scope and verified rollback, perform a controlled production cutover.

## 7. Actions taken
- Read-only production and TEST table/column catalogue inspection.
- Read-only production and TEST migration ledger inspection.
- Read-only production and TEST Edge Function inventory.
- Static source scan of v2 component Supabase table and RPC references.
- No database writes, migration runs, Edge Function deployments, user deletions, data reset, merge/rebase or production deploy.

**B62 result:** Production-to-app contract mismatch is broader than the earlier profile/admin finding. The current production database cannot support the full SturmKopf 1.1 application. Production remains NO-GO.
