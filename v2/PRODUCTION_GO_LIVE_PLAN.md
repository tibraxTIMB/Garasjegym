# Production GO LIVE – reconciliation and release plan

**Status:** NO-GO – Phase A capture recorded; backup/recovery evidence and production-derived migration rehearsal remain blocked  
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
| Registered migrations | 11 | 163 |
| PostgreSQL | 17.11.0.019 | 17.12.0.000 |

Both Supabase projects are active and healthy. They are separate projects in different regions.

### Production migration history

Production currently records these eleven migrations:

- `20261116213905_lock_down_manager_profile_updates`
- `20261116214010_restrict_trigger_function_execution`
- `20261116214020_restrict_anon_security_definer_rpc`
- `20261117191749_workout_result_scoring_fields`
- `20261117210956_align_workout_log_result_data`
- `20261118184920_wod_timer_settings_and_exercise_metadata`
- `20261118194052_exercise_prescription_profiles`
- `20261119223903_revoke_anon_security_definer_execute`
- `20261119224030_harden_production_security_definer_paths`
- `20261120214242_secure_pt_session_capacity`
- `20261120214355_revoke_anon_public_table_access`

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

### Object-level schema drift (same-day production/test comparison)

The deeper comparison confirms that the 28 missing tables are only part of the gap:

| Object type | Production | Test | Difference |
|---|---:|---:|---|
| Public columns | 173 | 502 | 329 test-only; 0 production-only; 2 changed |
| RLS policies | 49 | 129 | 83 test-only; 3 production-only; 8 changed |
| Indexes | 38 | 170 | 133 test-only; 1 production-only |
| Constraints | 70 | 223 | 153 test-only; 0 production-only; 1 changed |
| Triggers | 6 | 25 | 20 test-only; 1 production-only |
| Public functions | 8 | 42 | 34 test-only; 0 production-only; 3 changed |
| Public views | 1 | 1 | 1 changed definition |

Important differences on existing production tables:

- `exercises.body_area`: production is nullable with no default; test is NOT NULL with default `'Fullkropp'`.
- `workout_logs.result_data`: production is NOT NULL with default `'{}'::jsonb`; test is nullable with no default. This must be reconciled against every app insert/update path before changing either side.
- `class_bookings.status`: production check constraint does not allow `waitlist`; test does. The class booking insert/update policies and trigger logic have also evolved.
- `check_class_booking_capacity()`, `handle_new_auth_user()`, and `is_active_user()` differ between projects. In particular, the test signup trigger creates new profiles inactive and pending, and test active-user checks require approved membership. Preserve this safety behavior when bringing production forward.
- Production has three policies not present in test: `member_preferences_select_own`, `pt_bookings_delete`, and `pt_bookings_insert`. These are legacy access paths that must be reconciled with the stricter test policies before launch.
- Production has a unique partial index `class_bookings_one_active` on `(class_id, member_id)` for confirmed/pending bookings. Test has a differently named replacement index that includes the waitlist state. Do not drop the production index until the replacement's uniqueness and waitlist semantics are verified against existing rows.
- Production has one legacy `class_bookings_capacity_check` trigger; test uses the newer row-locking capacity guard plus waitlist promotion and booking notifications. Replace only after concurrency and waitlist tests pass.

The 329 column, 83 policy, 133 index, 153 constraint, 20 trigger, and 34 function differences are not safe to solve by copying objects blindly. They require a reviewed, ordered forward migration with data-preserving transformations and role-specific tests.

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

## 3A. Production hardening applied – 2026-11-20

Two controlled, forward-only security migrations were applied to the production project `kultdmklwmilhoytrrig` after inspecting the live objects and policies:

1. Migration history version `20261120214242_secure_pt_session_capacity`
   - Replaced `public.pt_session_capacity` with a `SECURITY INVOKER` view.
   - Added `private.pt_session_capacity_counts()` with an explicit authenticated-user and active-membership check.
   - Revoked `anon` and `PUBLIC` access to the private helper and view; granted the intended access to `authenticated` and `service_role`.
   - Verified `security_invoker=true`, zero `anon` schema usage/helper EXECUTE/view SELECT, and the expected authenticated privileges.
   - Supabase Security Advisor no longer reports `security_definer_view`.

2. Migration history version `20261120214355_revoke_anon_public_table_access`
   - Revoked all direct `anon` privileges on public tables and sequences.
   - Revoked default privileges for future public tables and sequences from `anon`.
   - Verified production still has 18/18 public tables with RLS enabled, zero tables with direct `anon` privileges, and zero public sequences with direct `anon` privileges.

Additional production audit after these changes:
- 7 public SECURITY DEFINER functions; zero are executable by `anon`.
- Zero public SECURITY DEFINER functions have a missing fixed `search_path`.
- Supabase Security Advisor still reports 4 authenticated SECURITY DEFINER function warnings (the reviewed `book_pt_session`, `is_active_user`, `is_admin`, and `is_admin_or_manager` functions) and leaked-password protection remains disabled.
- Health Advisor reports no lints.
- Production schema remains 18 public tables versus 46 in test. The app's Pages workflow still hardcodes the test project URL and publishable key.
- No app deployment, test data copy, or bulk schema migration was performed.

These hardening migrations reduce production exposure but do not close the 28-table gap or resolve the object-level schema differences. **Release status remains NO-GO.**

## 3B. Updated migration ledger reconciliation – 2026-11-20

A fresh version-prefix comparison was run against the current STURMKOPF branch and both live Supabase migration ledgers:

- `v2/supabase/migrations`: 163 SQL files.
- Test project migration ledger: 163 installed versions.
- Test versions without a matching V2 SQL file: 0.
- V2 SQL files absent from the test ledger: 0.
- Production project: 11 installed versions; none of those 11 versions is present in the V2 migration directory.

This supersedes older QA notes that reported 15 test migration versions without SQL files and four V2 SQL files absent from the test ledger. Those statements are stale for the current branch. The V2 test migration history is now file/ledger-aligned by version.

The test history remains separate from production and must not be replayed against production. It includes a test-only baseline and test seed migration. The root-level legacy `supabase/migrations` directory is a separate 15-file set and must not be mixed with `v2/supabase/migrations`.

The 11 production-applied versions still need their original SQL source archived or reconstructed from live production definitions and repository history. A new production-derived forward-only migration sequence is still required.

Evidence: [MIGRATION_RECONCILIATION_2026-11-20.md](./MIGRATION_RECONCILIATION_2026-11-20.md) and [PRODUCTION_CAPTURE_2026-11-20.md](./PRODUCTION_CAPTURE_2026-11-20.md).

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


## 3C. Live definition-level reconciliation – 2026-11-20

A new read-only catalog comparison was run against both live projects. This is the latest object inventory and supersedes earlier object-count estimates above and in the Phase A/B1 notes:

| Object | Production | Test | Test-only | Production-only | Changed definitions |
|---|---:|---:|---:|---:|---:|
| Columns | 173 | 509 | 336 | 0 | 2 |
| Constraints | 70 | 226 | 156 | 0 | 1 |
| RLS policies | 49 | 144 | 104 | 9 | 34 |
| Indexes | 38 | 181 | 144 | 1 | 0 |
| Triggers | 7 | 53 | 48 | 2 | 0 |
| Public functions | 8 | 75 | 67 | 0 | 7 |
| Public views | 1 | 1 | 0 | 0 | 0 |

Changed existing column definitions:
- `exercises.body_area`: nullable/no default in production; NOT NULL/default `'Fullkropp'` in test.
- `workout_logs.result_data`: NOT NULL/default `'{}'::jsonb` in production; nullable/no default in test.

Changed constraint: `class_bookings_status_check` in test permits `waitlist`, production does not.

The seven shared changed function definitions include:
- `handle_new_auth_user()`: test creates new members inactive and pending; production currently creates the profile using the active default and has no approval status assignment.
- `is_active_user()`, `is_admin()`, `is_admin_or_manager()`: test requires approved membership as well as active status; production checks active status and role only.
- `book_pt_session()`: test excludes client-linked private PT sessions from public booking; production does not.
- `check_class_booking_capacity()`: test locks the class row and validates waitlist eligibility; production does not have the same concurrency guard.
- `pt_promote_waitlist_after_cancel()`: test limits promotion to published future sessions, uses row locking/skip-locked behavior, and creates a notification; production has the older promotion behavior.

The production and test `pt_session_capacity` views now have matching definition hashes and `security_invoker=true`. Both have anon SELECT disabled.

### Edge Function parity

- Production: `garasjegym-music` active v2, JWT verification disabled.
- Test: `admin-delete-user` active v2, JWT verification enabled; `admin-create-user` active v2, JWT verification enabled.
- Test `admin-create-user` returns HTTP 410 and explicitly disables account creation.
- Production has no `admin-delete-user` function. The test delete function checks historical references across tables that do not yet exist in production, so it must not be deployed unchanged. Adapt it only after the production schema and FK/reference preservation rules are finalized. Preserve the production music integration and review its JWT/secrets separately.

Detailed evidence and release implications: [GO_LIVE_PHASE_B2_DEFINITION_RECONCILIATION_2026-11-20.md](./GO_LIVE_PHASE_B2_DEFINITION_RECONCILIATION_2026-11-20.md).

**Phase B2 is complete as a read-only review.** No test or production changes, backups, restores, migrations or deployments were performed. Production remains NO-GO pending backup/PITR evidence, an isolated restore rehearsal, production-origin migration reconstruction, and explicit owner GO LIVE approval.


## 3D. Phase B3 – app-to-production dependency audit (2026-11-20)

**Status: NO-GO.** Read-only audit only; no database, Auth, Edge Function, or hosting changes.

The live production `profiles` table has neither `email` nor `membership_status`, but the current STURMKOPF `fetchMemberProfile()` query in `v2/src/lib/auth.js` selects both. `App.jsx` then gates application access on `membership_status`. A frontend-only release against the current production schema can therefore fail during profile bootstrap. This is a hard release blocker.

The current frontend also calls class booking RPCs and reads live class-session tables; test-only class-live tables are missing from production. PT Studio calls newer PT programme/intake/goal/check-in tables and RPCs that are absent from production. The app's member-deletion action invokes `admin-delete-user`, which is not deployed in production; the test implementation has reference checks for tables/columns absent from production and cannot be copied unchanged.

See the detailed call-path map, production column evidence, and ordered remediation gates in [GO LIVE Phase B3 – app dependency audit](GO_LIVE_PHASE_B3_APP_DEPENDENCY_AUDIT_2026-11-20.md).

Required next steps are a deliberate membership/email compatibility and backfill design; an atomic booking/waitlist migration; a production-derived PT/WOD dependency migration; and a production-schema-specific deletion Edge Function. All must be rehearsed from a verified recovery point before production changes. Do not ship the current frontend unchanged to production.

