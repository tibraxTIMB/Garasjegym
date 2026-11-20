# Production GO LIVE – reconciliation and release plan

**Status:** NO-GO / preparation only  
**Last verified:** 2026-11-20  
**Working branch:** `garasjegym-2.0-sturm­kopf`  
**Production project:** `kultdmklwmilhoytrrig` (`Garasjegym`)  
**Test project:** `izwzwvlexqxqewzijhhd` (`garasjegym-2-test`)

This document is the controlled release plan for bringing the production database up to the STURMKOPF schema. It is not permission to deploy. Production has not been changed by this work.

## 1. Current evidence

| Check | Production | Test |
|---|---:|---:|
| Public base tables | 18 | 46 |
| Public tables with RLS enabled | All 18 reported enabled | 46 / 46 |
| Public tables without any RLS policy | Not yet fully audited | 0 |
| Anonymous table grants | Not yet fully audited | 0 |
| Registered migrations | 9 | More than 80 |
| PostgreSQL | 17.11.0.019 | 17.12.0.000 |

Both Supabase projects are active and healthy. They are separate projects in different regions.

### Production migration history

Production currently records these nine migrations:

- `20261116213905_lock_down_manager_profile_updates`
- `20261116214010_restrict_trigger_function_execution`
- `20261116214020_restrict_anon_security_definer_rpc`
- `20261117191749_workout_result_scoring_fields`
- `20261117210956_align_workout_log_result_data`
- `20261118184920_wod_timer_settings_and_exercise_metadata`
- `20261118194052_exercise_prescription_profiles`
- `20261119223903_revoke_anon_security_definer_execute`
- `20261119224030_harden_production_security_definer_paths`

Test has a different migration history, including a test-only baseline and many later feature migrations. **Do not replay the test migration history directly against production.** The version histories are not aligned and doing so can cause duplicate-object failures, partial schema changes, or data loss.

### Tables present in test but absent from production

The current schema inventory shows these 28 tables missing in production:

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
- `training_sessions`
- `wod_daily_schedules`
- `wod_favorites`

This list is a table-presence comparison, not a complete column, constraint, trigger, index, policy, function, or seed-data diff. Existing production tables also require a column-level comparison before migration SQL can be approved.

### Live HR schema

Test has `hr_enabled`, `hr_share_with_pt`, `hr_share_on_screen`, and `hr_save_history` on `member_preferences`. Production currently has only the older `user_id`, `super_simple_mode`, and `updated_at` columns. The Live HR migration is not installed in production.

## 2. Security fix prepared and verified in test

Production's `public.pt_session_capacity` view had no `security_invoker` option and had grants for `anon` and `authenticated`. Its query aggregates booking counts, but as a default owner-privileged view it bypasses underlying RLS.

The new migration `20261120110502_secure_pt_session_capacity.sql`:

1. Creates a non-exposed `private` schema.
2. Creates `private.pt_session_capacity_counts()`, which checks `auth.uid()` and active membership and returns aggregate counts only.
3. Uses a `SECURITY INVOKER` public view over that helper.
4. Revokes view access from `PUBLIC` and `anon`.
5. Grants the view to `authenticated` and `service_role`, and grants helper execution only to those roles.

Applied to the test project only. Verification confirmed:

- View option is `security_invoker=true`.
- `anon` has no schema usage, helper execution, or view SELECT.
- `authenticated` has helper execution and view SELECT.
- An unauthenticated call is rejected with an active-membership error.
- An authenticated active test identity can query the view (the current test seed returned zero published PT sessions).

This preserves the existing aggregate-only view contract without exposing individual booking rows. The same migration is committed to the STURMKOPF branch for later production use.

## 3. Required production reconciliation workflow

Do not use the test database as a replacement for production and do not copy test data into production.

### Phase A – freeze and capture

- Confirm production backup/PITR availability and take a fresh recoverable backup before any DDL.
- Export production schema, row counts, migration history, extensions, grants, RLS policies, functions, triggers, views, indexes, and Auth settings.
- Record current production app version and deployment target.
- Keep the production app and database unchanged during preparation.

### Phase B – build a forward-only migration set

Create a new release migration sequence from the actual production schema, not by replaying test history. It must include:

1. Alterations to existing production tables, with explicit preservation of existing rows and defaults.
2. Missing feature tables in dependency order, including foreign keys and indexes.
3. RLS policies for each new table, tested against member, manager, admin, and anonymous roles.
4. RPCs and triggers, with explicit EXECUTE grants and fixed search paths.
5. Views with `security_invoker=true`, except for a documented and tested alternative that cannot expose underlying rows.
6. Seed/configuration rows only where required; never copy test accounts or test workout data.
7. HR preference columns with all defaults false.
8. The secure PT capacity view/helper migration in this branch.

Before approval, compare the resulting production schema to the test schema table-by-table and column-by-column. Reconcile differences deliberately; do not drop production-only columns, rows, or objects as a shortcut.

### Phase C – rehearse

- Restore a fresh production backup into an isolated rehearsal project.
- Apply the forward-only migration sequence to that restored copy.
- Run all app SQL tests and the complete STURMKOPF CI suite.
- Test existing member sign-in, profile and membership status, PT notes/messages/bookings, class bookings/waitlist, workout history/PRs, WOD assignment and deletion, notifications, calendar, and coffee orders.
- Test row isolation: a member must never read another member's PT notes, messages, bookings, workout logs, or personal records.
- Verify idempotency and rollback/recovery instructions.
- Compare pre/post row counts and key relationships.

### Phase D – controlled release

Only after rehearsal passes and the owner explicitly confirms GO LIVE:

1. Put the app into a maintenance/release window if required.
2. Take a final production backup.
3. Apply the approved forward-only migrations in order.
4. Run post-migration SQL checks and smoke tests.
5. Deploy the matching app build.
6. Verify auth, role-based access, PT, classes, WOD, workout logging, and notifications.
7. Keep a rollback/recovery decision log. Database rollback must be a tested restore/recovery plan, not blind reverse DDL.

## 4. Remaining security settings and audit

The test advisor now reports 13 authenticated `SECURITY DEFINER` RPC warnings and one Auth warning for leaked-password protection. The previous `security_definer_view` finding is no longer reported in test after the new view migration.

The 13 authenticated RPCs are an intentional application API surface, not 13 anonymous entry points. The audited grants exclude `anon` and `PUBLIC`; each function is granted to `authenticated` and/or system roles. The reviewed authorization patterns are:

- `book_class`, `book_pt_session`: require an authenticated active member; validate published/future session, duplicate booking, and capacity.
- `create_pt_program_with_sessions`: requires active admin/manager.
- `get_class_attendance_counts`: requires active membership, caps a request at 100 class IDs, and limits unpublished classes to staff.
- `get_infotainment_schedule`: requires active membership and limits the requested period to 31 days.
- `is_active_user`, `is_admin`, `is_admin_or_manager`: evaluate the caller's own profile via `auth.uid()`; they do not accept a target user ID.
- `place_coffee_order`: legacy wrapper delegates to `place_coffee_order_v2`, which checks the caller's active membership. Keep the wrapper only while compatibility requires it.
- `skip_coffee_product_review`, `submit_coffee_product_review`: require active membership and verify that the order item belongs to the caller and is collected.
- `toggle_social_reaction`: requires active membership and validates the reaction and target post.

These functions must remain on a reviewed allowlist with regression tests. Do not remove the warning by blindly changing atomic booking/order functions to invoker mode; that can break their intended transaction and RLS behavior. If a function is not needed by the app, revoke its authenticated EXECUTE grant in a separate reviewed migration.

The test performance advisor also reports 41 RLS init-plan warnings and unindexed foreign-key warnings. These are performance findings, not authorization bypasses. Fix them in a separate optimization pass after verifying policy semantics and query plans; do not bulk-rewrite policies as part of a production schema reconciliation.

- Supabase's production advisor reported leaked-password protection disabled. This is an Auth configuration setting, not a SQL migration. It must be enabled in the production Auth settings after confirming the user-facing password policy and recovery flow. It has not been changed by this work.


- Supabase's production advisor reported leaked-password protection disabled. This is an Auth configuration setting, not a SQL migration. It must be enabled in the production Auth settings after confirming the user-facing password policy and recovery flow. It has not been changed by this work.
- The test audit found 27 `SECURITY DEFINER` functions in `public`. Several are trigger-only and have execution restricted to system roles; member-facing RPCs have explicit authenticated grants and perform identity/role checks. Keep a per-function allowlist and test each member-facing RPC. Do not mechanically convert all of them to invoker functions because some are intentional atomic workflows or RLS helper functions.
- Review all advisor warnings, including unindexed foreign keys and RLS init-plan performance warnings. These are not all launch blockers, but the final release must record accepted risks and resolve avoidable warnings.
- Verify production's `pt_session_capacity` view is replaced by the secure aggregate implementation before app deployment.

## 5. GO LIVE gates

Release remains **NO-GO** until all are true:

- [ ] Full production-to-target schema diff reviewed and signed off.
- [ ] Forward-only migrations rehearsed on a fresh production restore.
- [ ] No destructive or data-loss operations without explicit approval.
- [ ] RLS and RPC authorization tests pass for all roles.
- [ ] PT capacity view security fix deployed and verified in rehearsal.
- [ ] Leaked-password protection enabled and tested.
- [ ] All required app features pass end-to-end smoke tests.
- [ ] CI build, SQL checks, and automated tests pass on the exact release commit.
- [ ] Production backup and recovery plan confirmed.
- [ ] Explicit owner GO LIVE approval recorded.

## 6. Tooling note

The Supabase CLI is not installed in the current execution environment, so this work did not run `supabase migration new`, `supabase db diff`, or `supabase migration list --local`. The migration file follows the repository's existing 12-digit timestamp convention and was applied to the isolated test project using the Supabase migration tool. Before final production migration generation, use a pinned Supabase CLI v2 workflow in a controlled local/CI environment and inspect the generated diff before accepting it.
