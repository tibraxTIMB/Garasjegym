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



## 3E. Phase B4 – production-derived migration design (2026-11-20)

**Status: DESIGN COMPLETE / NO-GO.** B4 defines six dependency-ordered migration waves: (0) backup/PITR and isolated restore; (1) membership/profile/Auth; (2) class booking/capacity/waitlist; (3) PT Studio; (4) WOD/workout/PR; (5) optional coffee/notifications/social/calendar; and (6) production-specific member-deletion Edge Function. It includes preflight checks, role-based acceptance tests, data preservation requirements, stop conditions and rollback principles.

The design explicitly rejects replaying the 163 test migrations against production. It also identifies the important membership nuance in the inspected test migration: existing profiles receive approved by default while new signups become inactive/pending. Existing accounts and the owner/admin recovery path must be audited before adopting that behavior.

Detailed sequence and acceptance gates: [GO LIVE Phase B4 – migration design](GO_LIVE_PHASE_B4_MIGRATION_DESIGN_2026-11-20.md).

**Next gate:** Wave 0. The owner must provide the latest completed production backup/PITR timestamp and confirm the recovery rehearsal route. Any paid resource requires cost disclosure and explicit approval. No production DDL, Auth changes, Edge Function deployment or hosting deployment has been performed.


## 3F. Phase B5 – Wave 0 recovery readiness check (2026-11-20)

Read-only inspection reconfirmed both Supabase projects are `ACTIVE_HEALTHY`. No development branches exist on either project. No branch or project was created and no cost-bearing resource was provisioned.

The available project/database interfaces do not expose a verifiable completed production backup timestamp, PITR retention window, or restore-test result. Project health is not evidence of recoverability. **Wave 0 remains blocked** until the owner supplies the backup/PITR evidence from Database → Backups in the production dashboard and a cost-approved isolated restore route is identified.

Do not call production restore as an inspection shortcut. No production DDL, data, Auth, Edge Function, secrets, hosting or project configuration was changed.

Detailed evidence: [GO LIVE Phase B5 – Wave 0 recovery readiness](GO_LIVE_PHASE_B5_WAVE0_RECOVERY_READINESS_2026-11-20.md).


## 3G. Phase B6 – release candidate verification (2026-11-20)

The current branch commit passed the configured STURMKOPF verification workflow: 19/19 executed steps succeeded, including migration checks, WOD ordering, training launch context, timer calculations, mobile gestures, Bluetooth heart-rate parsing and the Vite build. This is an automated build/test pass, not proof of production compatibility or end-to-end acceptance.

Fresh production advisors still report four authenticated-callable SECURITY DEFINER RPC warnings, leaked-password protection disabled, 14 unindexed foreign-key findings and 34 RLS init-plan findings. Test advisors report 25 SECURITY DEFINER warnings. Findings require function-by-function review; no blanket revocations or policy/index changes are authorized.

The Pages workflow builds against TEST and only publishes the shared Pages URL after a manual `publish_preview=true` dispatch. It is not the production release pipeline and was not triggered.

**Overall remains NO-GO:** production schema/Auth dependencies from B3 are unresolved and Wave 0 backup/PITR recovery readiness from B5 is unverified. No production deployment or database changes.

Detailed evidence: [GO LIVE Phase B6 – release candidate verification](GO_LIVE_PHASE_B6_RELEASE_CANDIDATE_VERIFICATION_2026-11-20.md).


## 3H. Phase B7 – final pre-production gate (2026-11-20)

Latest verification runs on the B6 report commit `188212a5a6d8b90a848b0a8edfc91e86bc23b36c`:
- Full GarasjeGym 2.0 checks (Node 20, full test suite and build): run 44825668762 – SUCCESS.
- STURMKOPF focused checks (Node 22): run 44825668913 – SUCCESS.
- Pages preview build: run 44825668830 – CANCELLED during dependency installation; no deployment occurred.

The application code is green under both verification workflows. This does not clear the production schema/Auth, recovery, security or owner-approval gates. The current frontend remains incompatible with several parts of the production schema, and Wave 0 backup/PITR recovery evidence remains unavailable.

**Production remains NO-GO.** Safe work may continue on the isolated branch: author production-derived migration units, preflight/postflight assertions, rollback/forward-fix plans, and role/concurrency tests. No production DDL/DML, Auth, Edge Function, secrets, hosting or paid resource changes.

Detailed gate: [GO LIVE Phase B7 – final pre-production gate](GO_LIVE_PHASE_B7_FINAL_PREPRODUCTION_GATE_2026-11-20.md).


## 7. Phase B8 – membership/Auth production migration design (2026-11-20)

Latest CI after the B7 evidence commit `f5be8f17d7d3e4601b3ebc7b145fcbc0ac750d4c`:

- GarasjeGym 2.0 checks, run `44825826208`: SUCCESS.
- STURMKOPF build and focused tests, run `44825826161`: SUCCESS.
- Pages preview run `44825826198`: CANCELLED during build; deploy job cancelled. No deployment occurred.

A fresh aggregate-only production query found 3 profiles, all active (1 admin, 2 members), and 3 Auth users all matched to profiles. No active profile lacked an Auth user. The production `profiles` table does not yet contain `email` or `membership_status`. No row data was changed.

The existing test migration that adds membership fields defaults `membership_status` to `approved`. That default is not safe to reuse unchanged in production because a future direct profile insert could bypass the Auth trigger. The production-derived design therefore uses a fail-closed `pending` default, explicitly backfills only the currently active accounts to approved, preserves their roles/active flags, and ensures new Auth signups are inactive/pending. It also requires preservation of the existing admin and explicit tests for member, manager, admin, pending, rejected and anonymous access.

The complete preflight, migration semantics, test matrix and recovery requirements are recorded in [GO_LIVE_PHASE_B8_MEMBERSHIP_AUTH_MIGRATION_DESIGN_2026-11-20.md](./GO_LIVE_PHASE_B8_MEMBERSHIP_AUTH_MIGRATION_DESIGN_2026-11-20.md).

**B8 outcome:** CI core checks green; membership/Auth migration design prepared for isolated rehearsal. No production or test DDL/DML, Auth changes, Edge Function changes or deployments were performed. Backup/PITR evidence and a successful isolated restore rehearsal remain hard blockers. Release remains **NO-GO**.


## 8. Phase B9 – class booking/waitlist production migration design (2026-11-20)

Fresh read-only production inventory:

- 1 class and 1 booking (status confirmed).
- 0 duplicate active confirmed/pending member/class pairs.
- Production `class_bookings` has only 6 columns and no attendance fields.
- Production `classes` has 15 columns but lacks the test schema's `published` and `instructor_id` fields.
- Existing production unique index is `class_bookings_one_active`, partial on confirmed/pending. It must be preserved until a replacement including waitlist is proven.

Review of the test class booking migrations identified adaptation requirements: explicit publication and instructor ownership mapping; attendance schema/RLS; safe transition from the differently named production unique index; one serialized capacity guard; deterministic waitlist promotion; role-isolated attendance and booking access; and concurrency tests for last-seat booking and cancellation/promotion races. The test migrations cannot be copied unchanged.

Full preflight, schema sequencing, acceptance tests and execution boundary are recorded in [GO_LIVE_PHASE_B9_CLASS_BOOKING_MIGRATION_DESIGN_2026-11-20.md](./GO_LIVE_PHASE_B9_CLASS_BOOKING_MIGRATION_DESIGN_2026-11-20.md).

**B9 outcome:** Production data is currently small and no active duplicate was found, but production schema is materially behind the app/test contract. No SQL or deployment changes were made. Backup/PITR and isolated restore remain hard blockers. Release remains **NO-GO**.


## 9. Phase B10 – PT Studio production migration design (2026-11-20)

Read-only production row counts confirm legacy data remains in `pt_sessions` (1 row) and `pt_bookings` (1 row); `pt_client_notes`, `pt_messages`, `pt_requests`, and `pt_session_exercises` currently have zero rows. These legacy tables and their contracts must be preserved.

Reviewed the two PT Studio source migrations. The proposed additive production sequence is split into coach/relationship foundation, intake/goals/programmes, then check-ins and integrations. Key unresolved risks include assigned-coach access being missing from manager-only policies, over-broad coach access, immutable member/coach field boundaries, active assignment uniqueness, cascading deletion/retention, and consistency between legacy PT records and new Studio objects.

The complete role matrix, source review, migration units and acceptance tests are recorded in [GO_LIVE_PHASE_B10_PT_STUDIO_MIGRATION_DESIGN_2026-11-20.md](./GO_LIVE_PHASE_B10_PT_STUDIO_MIGRATION_DESIGN_2026-11-20.md).

**B10 outcome:** PT Studio migration design prepared; no database, Auth, Edge Function or deployment changes were made. Backup/PITR and isolated restore remain hard blockers. Release remains **NO-GO**.


## 10. Phase B11 – WOD/workout/PR production migration design (2026-11-20)

Fresh production counts: `wods` 1, `workout_logs` 0, `workout_exercises` 0, `workout_sets` 0, `personal_records` 1. The existing PR is standalone (`workout_log_id IS NULL`) and must remain standalone; do not fabricate a workout log or attach it to a WOD.

Reviewed atomic workout save, structured result, PT linkage and PR integrity migrations. Production adaptation must preserve `workout_logs.result_data NOT NULL DEFAULT '{}'`, add dependencies before RPCs, preserve exact exercise sort order, keep PT completion atomic/idempotent, protect private PT WOD visibility, and validate PR ownership/units (including box height in cm). The detailed design and acceptance matrix are in [GO_LIVE_PHASE_B11_WOD_WORKOUT_PR_MIGRATION_DESIGN_2026-11-20.md](./GO_LIVE_PHASE_B11_WOD_WORKOUT_PR_MIGRATION_DESIGN_2026-11-20.md).

**B11 outcome:** WOD/workout/PR production migration design prepared; no database or deployment changes were made. Backup/PITR and isolated restore remain hard blockers. Release remains **NO-GO**.


## 11. Phase B12 – hosting/environment separation audit (2026-11-20)

The current Pages workflow is preview-only. It builds against the TEST Supabase project and only publishes to the shared Pages URL after a manual workflow dispatch with `publish_preview=true`. Push-triggered builds skip deployment. It is not a production workflow and must remain unchanged for preview use.

Production needs a separate protected deployment pipeline with production-only environment variables, exact commit/artifact provenance, manual approval, environment isolation and database-compatible rollback. No production workflow, Pages publish, secrets or environment variables were changed.

Full evidence and requirements are recorded in [GO_LIVE_PHASE_B12_HOSTING_ENVIRONMENT_AUDIT_2026-11-20.md](./GO_LIVE_PHASE_B12_HOSTING_ENVIRONMENT_AUDIT_2026-11-20.md).

**B12 outcome:** Preview/production separation verified; no production deployment path is authorized. Release remains **NO-GO**.


## 12. Phase B13 – live Auth/RPC security gate (2026-11-20)

Fresh Security Advisor checks at 22:08 UTC report four authenticated SECURITY DEFINER warnings in production (`book_pt_session`, `is_active_user`, `is_admin`, `is_admin_or_manager`) and 25 in test. Leaked Password Protection is disabled in both environments.

These functions require a per-function authorization/grant allowlist and role-based tests; do not mechanically convert them all to invoker mode or blanket-revoke authenticated EXECUTE. Production leaked-password protection must be enabled after confirming the user-facing password and recovery policy. No Auth or RPC setting was changed.

Detailed findings, remediation references and acceptance requirements are in [GO_LIVE_PHASE_B13_AUTH_RPC_SECURITY_GATE_2026-11-20.md](./GO_LIVE_PHASE_B13_AUTH_RPC_SECURITY_GATE_2026-11-20.md).

**B13 outcome:** Security findings reconciled; Auth configuration remains open. Release remains **NO-GO**.


## 13. Phase B14 – calendar, notifications, coffee and social integration design (2026-11-20)

Latest B13 commit `26149da8fedac8e7147622fd2a667ee7591721c4` has all three CI workflows successful: GarasjeGym 2.0 checks, STURMKOPF build/test and Pages preview build. The Pages deploy job was skipped, as designed; no site was published.

Fresh production catalog checks show `social_posts` exists with 0 rows and a `reactions jsonb` column. The V2 tables `notifications`, `coffee_products`, `coffee_orders`, `coffee_order_items`, `calendar_events`, `wod_favorites`, `pt_program_templates`, `pt_programs`, `pt_program_sessions` and `pt_checkins` are absent from production.

The B14 review defines the migration order and security requirements for favorites/calendar, recipient-scoped notifications, coffee order integrity, social reaction ownership and privacy-safe infotainment. In particular, trigger notifications need idempotency and recipient isolation; coffee prices must be sourced from trusted product rows; private PT details must never appear in infotainment; and staff calendar access must be role-scoped.

Full source review, production inventory, migration order and acceptance tests are recorded in [GO_LIVE_PHASE_B14_OPTIONAL_INTEGRATIONS_MIGRATION_DESIGN_2026-11-20.md](./GO_LIVE_PHASE_B14_OPTIONAL_INTEGRATIONS_MIGRATION_DESIGN_2026-11-20.md).

**B14 outcome:** Optional integration migration design prepared. No database or deployment changes were made. Backup/PITR evidence and isolated restore remain hard blockers. Release remains **NO-GO**.


## 14. Phase B15 – account deletion and profile-retention gate (2026-11-20)

Live Edge Function inventory confirms production has only `garasjegym-music`; the test-only `admin-delete-user` is not deployed in production. Source review shows the test delete function checks several test-only tables and omits important production references, so it cannot be deployed unchanged.

Fresh production FK catalog inspection identified CASCADE links from profiles to class bookings, personal records, PT bookings, PT notes/messages, PT requests, social posts/comments and workout logs, plus RESTRICT/NO ACTION links for staff-created records. Permanent Auth deletion could therefore erase training and social history or fail on authored records.

The release requirement is a production-specific, deactivation-first workflow. Permanent deletion must fail closed whenever the schema/reference inventory differs or any durable history exists. The last active approved admin and all admin accounts must be protected.

Full source review, FK inventory, risks and acceptance tests are recorded in [GO_LIVE_PHASE_B15_ACCOUNT_DELETION_RETENTION_GATE_2026-11-20.md](./GO_LIVE_PHASE_B15_ACCOUNT_DELETION_RETENTION_GATE_2026-11-20.md).

**B15 outcome:** Account deletion is blocked from production; no Edge Function/Auth/profile changes were made. Release remains **NO-GO**.


## 15. Phase B16 – Wave 0 recovery gate revalidation (2026-11-20)

Fresh project checks show production and test are both `ACTIVE_HEALTHY`. There are no Supabase development branches in either project. Production has 11 migration ledger entries; test has 163, and the histories are independent. No restore target exists.

The connected tools do not expose completed backup timestamps, PITR retention/recovery windows or restore outcomes. Project health must not be treated as backup evidence. No restore resource was created and no paid resource was requested.

Wave 0 remains blocked until the owner supplies the latest completed production backup timestamp/timezone, PITR status and recovery window, any backup warnings, and confirmation that an isolated restore can be performed without unapproved cost. A successful isolated restore and rehearsal must precede any production changes.

The exact evidence checklist and stop conditions are in [GO_LIVE_PHASE_B16_WAVE0_RECOVERY_GATE_REVALIDATION_2026-11-20.md](./GO_LIVE_PHASE_B16_WAVE0_RECOVERY_GATE_REVALIDATION_2026-11-20.md).

**B16 outcome:** Recovery gate revalidated and still NOT PASSED. No production/test database changes, restore, Auth/Edge Function changes or deployment were performed. Release remains **NO-GO**.


## 16. Phase B17 – executable read-only production preflight (2026-11-20)

Added `v2/supabase/preflight/production_wave_preflight_read_only.sql`, a SELECT-only preflight for required table/column presence and RLS enablement. Executed the query against production.

It confirms core membership/class/PT legacy/WOD/workout/social tables exist, but the V2 PT Studio, notifications, coffee, calendar and WOD favorites tables are absent. The contract columns `profiles.email`, `profiles.membership_status`, `classes.published`, `classes.instructor_id` and `class_bookings.attendance_status` are absent. `workout_logs.result_data` is present. RLS is enabled on all public base tables returned, but this does not establish policy correctness.

The full result and consequences are in [GO_LIVE_PHASE_B17_EXECUTABLE_PRODUCTION_PREFLIGHT_2026-11-20.md](./GO_LIVE_PHASE_B17_EXECUTABLE_PRODUCTION_PREFLIGHT_2026-11-20.md).

**B17 outcome:** A reproducible production schema gate is now committed and executed. No DDL/DML, Auth, Edge Function, secret or deployment changes were made. Backup/PITR and isolated restore remain hard blockers. Release remains **NO-GO**.


## 17. Phase B18 – backup capability and zero-budget recovery path (2026-11-20)

The connected Supabase organization record confirms the organization is on the **Free** plan. Current Supabase documentation states that automated daily backups are provided on Pro, Team and Enterprise, while Free projects should use Supabase CLI logical dumps and off-site backups. PITR is a paid add-on for Pro/Team/Enterprise and requires at least Small compute.

This corrects the Wave 0 diagnosis: the absence of daily backup/PITR evidence is expected on the current Free plan, not simply a missing dashboard lookup. To preserve the zero-budget constraint, the viable path is a private logical database dump via Supabase CLI, a separate Storage-object export, secure off-site copies and a successful isolated restore rehearsal. A logical dump is not equivalent to provider-managed PITR.

No plan upgrade, PITR, compute upgrade, new project/branch, export or restore was performed. The backup contains private member data and must remain encrypted and outside GitHub/chat. The full owner-workstation procedure and acceptance criteria are in [GO_LIVE_PHASE_B18_FREE_PLAN_BACKUP_RECOVERY_PATH_2026-11-20.md](./GO_LIVE_PHASE_B18_FREE_PLAN_BACKUP_RECOVERY_PATH_2026-11-20.md).

**B18 outcome:** Zero-budget recovery path prepared. Wave 0 remains NOT PASSED until the logical dump, Storage export and isolated restore are executed and verified. Production remains NO-GO.


## 18. Phase B19 – logical backup coverage gate (2026-11-20)

Current Supabase CLI documentation confirms `supabase db dump` excludes managed schemas including `auth` and `storage`; default dump is schema-only, while data and custom roles require separate `--data-only` and `--role-only` exports. Storage object bytes are not included in database dumps. Therefore a standard CLI dump is not a complete GarasjeGym project backup.

Wave 0 must separately establish Auth identity recovery, Storage metadata/object recovery, Edge Function source/config and Auth provider settings. If Auth recovery cannot be proven on the current Free plan, the owner must explicitly accept a documented recovery limitation or approve another supported backup approach. Do not claim full recovery based on public schema/data dumps alone.

The detailed coverage matrix, command outline and acceptance gate are recorded in [GO_LIVE_PHASE_B19_LOGICAL_BACKUP_COVERAGE_GATE_2026-11-20.md](./GO_LIVE_PHASE_B19_LOGICAL_BACKUP_COVERAGE_GATE_2026-11-20.md).

**B19 outcome:** Logical database dump alone is insufficient for full project recovery. No export or restore was performed. Wave 0 and production release remain **NO-GO**.


## 19. Phase B20 – Auth and Storage recovery inventory (2026-11-20)

Fresh aggregate-only production queries (no personal fields retrieved) show `auth.users` 3 rows, `auth.identities` 3 rows, `auth.sessions` 12 rows, `storage.buckets` 0 rows and `storage.objects` 0 rows. Auth users/identities must be securely preserved with their UUIDs. Active sessions should be invalidated on restore and users required to re-authenticate. Storage is currently empty, but must be rechecked at backup time.

Supabase's CLI dump reference and platform-to-self-hosted restore guide are not fully aligned about whether Auth schema data is included. The actual dump files must be inspected; do not assume. Supabase documents Auth user export via SQL Editor. Any Auth export may contain password hashes and personal information and must remain encrypted, private and outside GitHub/chat.

Detailed recovery requirements and counts are in [GO_LIVE_PHASE_B20_AUTH_STORAGE_RECOVERY_INVENTORY_2026-11-20.md](./GO_LIVE_PHASE_B20_AUTH_STORAGE_RECOVERY_INVENTORY_2026-11-20.md).

**B20 outcome:** Auth/Storage recovery inventory completed with aggregate counts only; no export or restore was performed. Wave 0 remains NOT PASSED. Production remains NO-GO.


## 20. Phase B21 – fresh security and performance advisor gate (2026-11-20)

Fresh read-only production advisors report:
- 4 authenticated SECURITY DEFINER warnings: `book_pt_session`, `is_active_user`, `is_admin`, `is_admin_or_manager`.
- 1 Auth warning: leaked password protection disabled.
- Performance: 14 unindexed foreign keys, 34 RLS init-plan warnings, 10 unused indexes, 3 tables with multiple permissive policies (`exercises`, `pt_session_exercises`, `wods`).

Test advisors report 25 SECURITY DEFINER warnings, leaked password protection disabled and 47 unused-index findings; test and production schema sizes differ and counts are not directly comparable.

No grants, functions, policies, indexes or Auth settings were changed. Do not mass-revoke, convert all SECURITY DEFINER helpers or drop indexes from advisor output alone. Remediation order and validation requirements are in [GO_LIVE_PHASE_B21_SECURITY_PERFORMANCE_ADVISOR_GATE_2026-11-20.md](./GO_LIVE_PHASE_B21_SECURITY_PERFORMANCE_ADVISOR_GATE_2026-11-20.md).

**B21 outcome:** Fresh security/performance baseline recorded. Production remains NO-GO pending Wave 0 recovery and schema migration gates.


## 21. Phase B22 – hosting and deployment isolation revalidation (2026-11-20)

Reviewed the three current workflows. The Pages preview build uses TEST Supabase izwzwvlexqxqewzijhhd, not production. Pushes build an artifact only; publishing the shared Pages URL requires manual workflow_dispatch with publish_preview=true and replaces the current shared Pages content. The STURMKOPF verification workflow runs targeted tests/build; the GarasjeGym 2.0 workflow runs full tests/build. Neither applies migrations or deploys production.

The B20 Pages run built successfully but its deploy job was skipped, so it did not publish. No dedicated production workflow exists. A future production workflow requires a protected manual environment, production-only variables, exact artifact provenance, production-derived migrations, backup/restore gate, pre/postflight and smoke tests. Do not add/activate it until recovery and migration rehearsals pass.

Full workflow audit is in [GO_LIVE_PHASE_B22_HOSTING_DEPLOYMENT_ISOLATION_2026-11-20.md](./GO_LIVE_PHASE_B22_HOSTING_DEPLOYMENT_ISOLATION_2026-11-20.md).

**B22 outcome:** Preview/production separation revalidated. No production workflow or deploy was added. Production remains NO-GO.


## 22. Phase B23 – production data-preservation baseline (2026-11-20)

Captured a fresh aggregate-only production baseline at 22:16:27 UTC: 3 profiles (1 admin, 2 members; all active), 1 class, 1 confirmed class booking, 1 legacy PT session, 1 PT booking, 1 WOD, 1 standalone PR, 0 workout logs/exercises/sets, 3 Auth users, 3 identities, 12 sessions and 0 Storage buckets/objects. The sole PR has no linked workout log and must remain standalone.

Explicitly prohibited test-only replay sources: the test seed migration inserts demo exercises/WOD/coffee/class; the first-signup bootstrap promotes the first account to admin; the test baseline is schema-only and not a production migration. Test and production migration ledgers are independent; do not replay the test chain.

B22 CI on commit bfed0bbf753bff31a355dfbd3b1b6b28e82d167d: STURMKOPF focused tests/build SUCCESS, full GarasjeGym checks SUCCESS, Pages build SUCCESS (attempt 2), Pages deploy SKIPPED. No publication occurred.

Full preservation contract and read-only results are in [GO_LIVE_PHASE_B23_PRODUCTION_DATA_PRESERVATION_BASELINE_2026-11-20.md](./GO_LIVE_PHASE_B23_PRODUCTION_DATA_PRESERVATION_BASELINE_2026-11-20.md).

**B23 outcome:** Production baseline recorded; no data or schema changes. This is not a backup and does not pass Wave 0. Production remains NO-GO.


## 23. Phase B24 – release identity and client build verification (2026-11-20)

Found stale user-facing version labels in login, mobile header, footer, Admin, Training and browser metadata. Added v2/src/lib/release.js as the single source of truth for RELEASE_NAME=STURMKOPF FEUER 1.1 and RELEASE_SHORT=FEUER 1.1; aligned app shell, Admin, Training, browser title, PWA description and README. Technical package semver remains 2.0.0, distinct from the Feuer 1.1 release/codename.

Final B24 commit da6467a34b7b205e0c86d49420f80fb4ec76a92e: STURMKOPF focused tests/build SUCCESS (44827794496); full npm test + bundle SUCCESS (44827794580); Pages build/artifact SUCCESS (44827794592); deploy SKIPPED. No preview publication or production deployment.

Full record: [GO_LIVE_PHASE_B24_RELEASE_IDENTITY_AND_BUILD_VERIFICATION_2026-11-20.md](./GO_LIVE_PHASE_B24_RELEASE_IDENTITY_AND_BUILD_VERIFICATION_2026-11-20.md).

**B24 outcome:** Release label aligned and CI green. This is not a production release; Wave 0 recovery remains blocked and production remains NO-GO.


## 24. Phase B25 – built artifact provenance and secret-boundary audit (2026-11-20)

Downloaded and inspected the Pages artifact from run 44827794592, artifact 14674632850, source commit da6467a34b7b205e0c86d49420f80fb4ec76a92e. SHA-256 from GitHub and local computation matched: edf8112444ef52790608aabd3c473f6397b8cf4bfbf3aa094ab048e2a342bafe. Artifact has 39 tar entries (37 regular files), including lazy-loaded app modules.

Built-bundle scan: TEST project ref present; production project ref absent; service_role absent; no actual sb_secret token; no private-key PEM header; STURMKOPF FEUER 1.1 present. The SDK contains only the literal sb_secret_ prefix used for key-format detection, not a key value. No production URL or privileged key was found.

Deploy job was SKIPPED. Artifact remains an unpublished TEST preview; no production deployment. Detailed evidence: [GO_LIVE_PHASE_B25_ARTIFACT_PROVENANCE_SECRET_BOUNDARY_2026-11-20.md](./GO_LIVE_PHASE_B25_ARTIFACT_PROVENANCE_SECRET_BOUNDARY_2026-11-20.md).

**B25 outcome:** Artifact provenance and environment boundary verified. No deployment or Supabase changes. Production remains NO-GO.


## 25. Phase B26 – automated build-artifact safety gate (2026-11-20)

Added v2/scripts/check-release-artifact.mjs and npm script check:release-artifact. It verifies the built dist contains the expected TEST project reference and Feuer 1.1 identity, excludes the production project ref, service_role and actual sb_secret token values, and contains the required WOD Builder/PT Studio/Training/Admin assets plus index and manifest. The guard runs after Vite build in all three workflows.

The first guard run correctly failed because the verification build had no Supabase environment configured. Fixed both verification workflows to build explicitly against the isolated TEST project and labelled the full check as a TEST bundle. This is not a production build.

Latest final CI commit 54d64c717bbf80823f3ef4748d38e97fadd21461: full GarasjeGym checks SUCCESS (44828172562), STURMKOPF focused checks SUCCESS (44828172172), preview build/artifact guard SUCCESS (44828097148), preview deploy SKIPPED. No production or Pages deployment.

Detailed report: [GO_LIVE_PHASE_B26_AUTOMATED_ARTIFACT_SAFETY_GATE_2026-11-20.md](./GO_LIVE_PHASE_B26_AUTOMATED_ARTIFACT_SAFETY_GATE_2026-11-20.md).

**B26 outcome:** Automated TEST-only artifact gate in place and final CI green. Wave 0 recovery still not passed; production remains NO-GO.


## 26. Phase B27 – isolated restore acceptance query pack (2026-11-20)

Added v2/supabase/preflight/restore_rehearsal_read_only.sql. It reports aggregate core data/Auth/Storage counts, Auth/profile linkage, standalone PR linkage, invalid roles, public-table RLS coverage, SECURITY DEFINER search_path settings and key schema-contract columns. It is SELECT-only and does not return member PII.

Executed the exact query against isolated TEST project izwzwvlexqxqewzijhhd; it completed successfully across all result categories. This validates SQL syntax/behavior only; TEST data is not a production restore and is not used as recovery evidence.

After the owner completes an encrypted source backup and isolated restore, run the query against that restored target and compare with the exact backup timestamp, then complete application smoke tests. Full record: [GO_LIVE_PHASE_B27_RESTORE_ACCEPTANCE_QUERY_PACK_2026-11-20.md](./GO_LIVE_PHASE_B27_RESTORE_ACCEPTANCE_QUERY_PACK_2026-11-20.md).

**B27 outcome:** Acceptance query pack prepared and TEST-validated. No production export, restore or changes. Wave 0 remains NOT PASSED; production remains NO-GO.


## 27. Phase B28 – owner backup/restore execution runbook and fresh platform inventory (2026-11-20)

Fresh read-only inventory confirms production ACTIVE_HEALTHY (PostgreSQL 17.11.0.019), TEST ACTIVE_HEALTHY (17.12.0.000), production migration ledger 11, TEST ledger 163. Production Edge Functions: only garasjegym-music v2 (verify_jwt=false, manual bearer validation and active-profile check). TEST-only admin-create-user/admin-delete-user functions are absent from production. Production music function source hash and required Soundtrack secret names are recorded in the runbook; no secret values were read. Branch protection remains unverified because the GitHub integration lacks permission for the protection endpoint.

Updated owner backup instructions to current Supabase CLI --remote syntax; --db-url is deprecated in CLI v3 and removed in v4. Standard CLI dumps exclude managed auth/storage schemas, so the public database dump cannot be called a complete project backup. Auth users/identities and supported UUID-preserving recovery remain a hard Wave 0 requirement. Previous Storage baseline was 0 buckets/0 objects and must be rechecked at snapshot time. Do not create a hosted restore project or paid resource without fresh quote and approval; do not overwrite TEST.

Detailed owner runbook: [GO_LIVE_PHASE_B28_OWNER_BACKUP_RESTORE_EXECUTION_RUNBOOK_2026-11-20.md](./GO_LIVE_PHASE_B28_OWNER_BACKUP_RESTORE_EXECUTION_RUNBOOK_2026-11-20.md).

**B28 outcome:** Current CLI instructions and project recovery inventory reconciled. No export, restore, production change, deployment or cost. Wave 0 remains NOT PASSED; production remains NO-GO.
