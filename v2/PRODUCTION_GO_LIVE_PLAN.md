Warning: truncated output (original token count: 22220)
Total output lines: 835

# Production GO LIVE – reconciliation and release plan

> **2026-11-21 Free-plan correction:** Official [Supabase password-security documentation](https://supabase.com/docs/guides/auth/password-security) limits leaked-password protection to Pro and above. The user's zero-cost constraint supersedes historical requirements below to enable it: **do not upgrade or pay**. On Free, verify a minimum password length of at least 12 characters, strongest available character requirements, disabled public signup, unique owner/admin credentials, tested owner/admin MFA, and working invitation/password recovery. Record owner acceptance that leaked-password screening is unavailable on Free. Follow `GO_LIVE_OWNER_BACKUP_RESTORE_AND_ADMIN_CHECKLIST.md`. All backup, Auth-preserving restore, reconciliation, clean-start and RLS gates remain mandatory; Production remains NO-GO.

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

Wave 0 remains blocked until the owner supplies…2220 tokens truncated… do not replay the test chain.

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


## 28. Phase B29 – post-recovery-runbook production security revalidation (2026-11-20)

Fresh production advisors: 4 authenticated-callable SECURITY DEFINER warnings; leaked-password protection disabled; performance findings 14 unindexed FKs, 34 RLS initplan warnings, 10 unused indexes, 3 multiple-permissive-policy tables; health advisor clear. Read-only inspection confirms all four flagged RPCs have fixed search_path pg_catalog, public, pg_temp; anon cannot execute; authenticated can. is_active_user/is_admin/is_admin_or_manager enforce caller UUID + active profile and role checks. book_pt_session enforces active caller, published/future slot, row lock, duplicate guard and capacity/waitlist assignment. No blanket privilege revokes or SECURITY INVOKER changes are justified without regression testing. Leaked-password protection remains a genuine hardening item to address after recovery readiness.

Detailed evidence: [GO_LIVE_PHASE_B29_PRODUCTION_SECURITY_REVALIDATION_2026-11-20.md](./GO_LIVE_PHASE_B29_PRODUCTION_SECURITY_REVALIDATION_2026-11-20.md).

**B29 outcome:** Function access paths and advisor warnings reviewed; no production changes. Wave 0 remains NOT PASSED; production remains NO-GO.


## 29. Phase B30 – migration lineage, exclusion rules and production release manifest (2026-11-20)

Reconciled current repo tree and live ledgers: production 11 versions, TEST 163 versions, v2 migration files 163 (version-aligned to TEST), root legacy migration set 15. None of the 11 production-applied version prefixes has a corresponding SQL source file in either current repository migration directory. This is a provenance gap; do not invent original SQL or substitute similarly named TEST migrations.

Explicitly excluded from production: TEST baseline `20261116225942_baseline_from_production_schema_no_data.sql`, demo seed `20261116230108_test_seed_data.sql`, and first-signup admin bootstrap `20261117090304_test_first_signup_admin_bootstrap.sql`. Root legacy migrations are separate and must not be mixed with v2 migrations. Reviewed membership reconciliation migration adds `membership_status` default approved and a pending/inactive signup trigger; production's three existing profiles require explicit preservation/approval-state review before this migration can be promoted. Coffee reconciliation and PT-program migrations have dependency assumptions and are not standalone feature packages.

B30 defines a forward-only production wave manifest: Wave 0 recovery; Wave 1 membership/Auth; Wave 2 class booking; Wave 3 PT Studio; Wave 4 WOD/workout/PR; Wave 5 optional integrations; Wave 6 account lifecycle. Every wave requires exact source hashes, SELECT-only preflight, data invariants, RLS/grant/RPC review, postflight, smoke tests and rehearsed recovery.

Detailed evidence: [GO_LIVE_PHASE_B30_MIGRATION_LINEAGE_AND_RELEASE_MANIFEST_2026-11-20.md](./GO_LIVE_PHASE_B30_MIGRATION_LINEAGE_AND_RELEASE_MANIFEST_2026-11-20.md).

**B30 outcome:** Production migration source lineage gap confirmed and release manifest documented. No production SQL or deployment. Wave 0 remains NOT PASSED; production remains NO-GO.


## 30. Phase B31 – fresh production data-preservation checkpoint (2026-11-20)

Fresh aggregate-only SELECT against production confirms: profiles 3 (1 admin, 2 members; all 3 active); classes 1; class bookings 1; legacy PT sessions 1; PT bookings 1; PT requests/messages/client notes 0; WODs 1; workout logs/exercises/sets 0; personal records 1 (still standalone with NULL workout_log_id); Auth users 3; identities 3; sessions 12; Storage buckets/objects 0. This matches the B23 baseline. No personal fields or row-level data were retrieved.

Preservation contract re-confirmed: preserve all existing Auth/profile identities and roles, class/booking, legacy PT session/booking, WOD, and standalone PR. Do not seed demo data or fabricate workout history. Recheck Storage at backup time. This aggregate checkpoint is not a backup or restore test.

Detailed evidence: [GO_LIVE_PHASE_B31_PRODUCTION_DATA_PRESERVATION_CHECKPOINT_2026-11-20.md](./GO_LIVE_PHASE_B31_PRODUCTION_DATA_PRESERVATION_CHECKPOINT_2026-11-20.md).

**B31 outcome:** Core aggregate counts remain stable. No production changes. Wave 0 remains NOT PASSED; production remains NO-GO.


## 31. Phase B32 – production catalog capture and trigger-function grant review (2026-11-20)

Added `v2/supabase/preflight/production_catalog_capture_read_only.sql`, a SELECT-only inventory for tables/RLS, columns/defaults, constraints, indexes, policies, triggers, functions, views, extensions and grants. All 12 query sections were executed individually against production and completed successfully. Fresh counts: 18 public tables (all RLS enabled), 173 columns, 70 constraints, 49 policies, 38 indexes, 6 non-internal triggers, 8 public functions and 1 view. No direct anon table grants.

The routine-grant inventory found one unnecessary grant exception: `public.set_updated_at()` (RETURNS trigger, SECURITY INVOKER) has EXECUTE for PUBLIC, anon and authenticated, unlike the other three trigger-returning functions which are restricted to postgres/service_role. This does not itself prove anonymous table access: anon has zero direct table grant rows and all public base tables have RLS. Because it is trigger-only, it cannot be called as an ordinary scalar/RPC function; nevertheless the grant is unnecessary and should be removed in a reviewed migration after restore rehearsal and trigger smoke tests. Proposed narrow revoke is documented but NOT applied. Also reconcile the existing production `restrict_trigger_function_execution` migration intent against this live ACL.

GitHub commit search for all eleven production migration version identifiers returned no matching commits; source lineage remains unresolved. Detailed record: [GO_LIVE_PHASE_B32_CATALOG_CAPTURE_AND_TRIGGER_GRANT_REVIEW_2026-11-20.md](./GO_LIVE_PHASE_B32_CATALOG_CAPTURE_AND_TRIGGER_GRANT_REVIEW_2026-11-20.md).

**B32 outcome:** Read-only catalog capture query pack validated; one unnecessary trigger-function EXECUTE grant exception documented for later rehearsal. No production changes. Wave 0 and production release remain NO-GO.


## 32. Phase B33 – effective privileges and future-function default ACL review (2026-11-20)

Fresh production effective-privilege checks: anon has public schema USAGE, but zero effective privileges on existing public tables and sequences; zero SECURITY DEFINER functions executable by anon; one public function executable by anon, the trigger-only invoker `set_updated_at()` already recorded in B32. All 18 public tables have RLS. Existing public tables and the view are postgres-owned.

New finding: `pg_default_acl` for objects created by role `postgres` in schema public grants default EXECUTE on new functions to anon (as well as authenticated/service_role), even though its default table and sequence ACLs exclude anon. This means future postgres-owned public functions can inherit anon EXECUTE unless migrations explicitly revoke it. A supabase_admin default ACL set also contains anon grants, but existing inspected public objects are postgres-owned; do not change platform-owned supabase_admin defaults without confirming execution context and platform dependencies.

Proposed, unapplied narrow fix after restore rehearsal: revoke anon EXECUTE from postgres-owned future public functions via ALTER DEFAULT PRIVILEGES, and revoke PUBLIC/anon/authenticated EXECUTE on trigger-only `set_updated_at()` while preserving postgres/service_role. Keep authenticated RPC grants intact and verify the default ACL and trigger behavior on the restored copy. Detailed record: [GO_LIVE_PHASE_B33_EFFECTIVE_PRIVILEGES_AND_DEFAULT_ACL_REVIEW_2026-11-20.md](./GO_LIVE_PHASE_B33_EFFECTIVE_PRIVILEGES_AND_DEFAULT_ACL_REVIEW_2026-11-20.md).

**B33 outcome:** Existing anon table/sequence access is zero, but future postgres-owned public functions inherit anon EXECUTE by default. A narrow default-ACL correction is prepared, not applied. Production remains NO-GO.


## 33. Phase B34 – RLS policy audience and PT capacity view verification (2026-11-20)

Fresh production RLS inventory: 49 policies; all target `authenticated`; none target `anon` or `PUBLIC`; 49 permissive and 0 restrictive. All 18 public tables have RLS enabled (none FORCE RLS). Multiple policies per table remain operation-specific; advisor overlap warnings on exercises, pt_session_exercises and wods are not grounds for blind policy consolidation. Behavioral member/member and member/coach isolation tests remain required on the restored production copy.

Verified live `pt_session_capacity` has `security_invoker=true`; anon has no private schema usage, helper EXECUTE or view SELECT; authenticated has the intended access. The view exposes only aggregate session capacity counts. Detailed record: [GO_LIVE_PHASE_B34_RLS_AUDIENCE_AND_PT_VIEW_VERIFICATION_2026-11-20.md](./GO_LIVE_PHASE_B34_RLS_AUDIENCE_AND_PT_VIEW_VERIFICATION_2026-11-20.md).

**B34 outcome:** Policy audience and PT aggregate view boundary verified; no new anonymous policy exposure found. No production changes. Production remains NO-GO pending Wave 0 and role-isolation rehearsal.


## 34. Phase B35 – production Edge Function source recovery and compatibility review (2026-11-20)

Recovered the deployed production `garasjegym-music` v2 `index.ts` source, previously absent from STURMKOPF, and archived it at `v2/supabase/functions/garasjegym-music/index.ts`. A fresh comparison confirms the repository copy matches the deployed production source byte-for-byte (3,200 characters); Supabase-reported SHA-256 is `3e369166c2c425c20c0e6af8e49adeaeef96c6e192479102f09a6acde1850e69`. No secret values were read or committed. Production function has `verify_jwt=false` but manually validates the Bearer token with Supabase Auth, then checks the caller's active profile. TEST-only `admin-create-user` and `admin-delete-user` are not deployed in production and must not be promoted as-is.

Release compatibility items: update music function membership check to require approved status when Wave 1 adds `membership_status`; review wildcard CORS and restrict to supported app origins once hosting origins are final; retain manual JWT validation while `verify_jwt=false`; review provider error detail exposure; securely verify required environment secret names/values without exposing them. No Edge Function change or deployment was made. Detailed record: [GO_LIVE_PHASE_B35_EDGE_FUNCTION_SOURCE_RECOVERY_AND_REVIEW_2026-11-20.md](./GO_LIVE_PHASE_B35_EDGE_FUNCTION_SOURCE_RECOVERY_AND_REVIEW_2026-11-20.md).

**B35 outcome:** Production music Edge Function source archived byte-for-byte and reviewed. Membership/CORS refinements and secure secret recovery remain release gates. Production remains NO-GO.


## 35. Phase B36 – installed migration provenance and forward-only rollout map (2026-11-20)

Fresh read-only reconciliation: production ledger 11 entries; TEST ledger 163 entries; STURMKOPF `v2/supabase/migrations` has 163 SQL files, all represented in TEST; root legacy migration directory has 15 separate files. None of the 11 production-installed version prefixes exists as a same-version source file in either repository migration directory. The exact 11 version/name pairs and conservative candidate-only mappings are recorded in [GO_LIVE_PHASE_B36_INSTALLED_MIGRATION_PROVENANCE_AND_ROLLOUT_MAP_2026-11-20.md](./GO_LIVE_PHASE_B36_INSTALLED_MIGRATION_PROVENANCE_AND_ROLLOUT_MAP_2026-11-20.md). Candidate TEST migrations are not treated as recovered originals.

B36 explicitly records three material differences: (1) the production trigger-function migration source is missing and the live `set_updated_at()` still has PUBLIC/anon/authenticated EXECUTE; the similarly named TEST migration does not revoke this function; (2) the TEST anon table/sequence grant migration does not remove anon EXECUTE from default public functions, while the production postgres default ACL does grant it; (3) production `workout_logs.result_data` remains NOT NULL/default `{}` and must not be changed to TEST's nullable contract. Membership reconciliation must use a fail-closed `pending` default, unlike the TEST file's `approved` default.

The latest completed CI commit `0bc9f66452b12958a65d4ae3e986c693c9e59794` passed full checks, focused STURMKOPF build/tests and preview build. This does not establish database recovery or production compatibility. No DDL/DML or production changes. Wave 0 remains blocked; production remains NO-GO.


## 36. Phase B37 – Auth recovery inventory and restore acceptance (2026-11-20)

Fresh production Auth aggregate inventory: 3 users, all 3 with non-empty password hashes and confirmed email; 3 identities; 0 orphan identities; 0 users without identity; 12 sessions; 12 refresh tokens; 0 orphan session rows; 0 refresh tokens with missing session links; 0 MFA factors; 0 SSO providers; 0 SAML providers. No PII, UUIDs, password hashes, tokens or identity payloads were selected. Production has one `auth.users` AFTER INSERT trigger `on_auth_user_created` calling SECURITY DEFINER `public.handle_new_auth_user()` with fixed search_path `pg_catalog, public, pg_temp`.

Added `v2/supabase/preflight/auth_restore_acceptance_read_only.sql`; its aggregate/fingerprint query and separate Auth trigger inventory both executed successfully against production. It emits counts, deterministic UUID-set/identity-link fingerprints, orphan checks and trigger definitions, not raw Auth secrets/PII. Re-run against the isolated restore and compare. Detailed record: [GO_LIVE_PHASE_B37_AUTH_RECOVERY_INVENTORY_AND_ACCEPTANCE_2026-11-20.md](./GO_LIVE_PHASE_B37_AUTH_RECOVERY_INVENTORY_AND_ACCEPTANCE_2026-11-20.md).

Official Supabase guidance distinguishes Auth recovery from a public-schema dump: Auth schema data includes users/identities, and the Auth migration guidance covers password hashes; standard CLI dumps exclude managed `auth`/`storage` schemas. A destination with a different JWT secret invalidates existing tokens, so fresh sign-in must be tested even if password hashes and UUIDs are preserved. Raw exports are highly sensitive and must stay encrypted/off-repo. A local Docker/Supabase rehearsal is only a zero-hosting-cost candidate until Auth service-version compatibility and actual sign-in/trigger/RLS tests pass.

**B37 outcome:** Auth inventory and privacy-safe acceptance query prepared and production-validated; no Auth data exported or changed. Actual encrypted export and isolated restore remain outstanding. Wave 0 remains blocked; production remains NO-GO.


## 37. Phase B38 – production security/performance advisor revalidation (2026-11-20)

Fresh production advisors at 22:36 UTC: security still reports 4 authenticated-callable SECURITY DEFINER warnings (`book_pt_session`, `is_active_user`, `is_admin`, `is_admin_or_manager`) and leaked-password protection disabled. The four functions were reviewed in B29 and have fixed search_path and intended caller/role checks; do not blindly revoke authenticated EXECUTE or convert them to invoker. Leaked-password protection is a real Auth hardening item to enable after Wave 0 recovery and then test.

Performance advisor: 14 unindexed FKs, 34 RLS initplan warnings, 10 unused indexes, 3 tables with multiple permissive policies. Health advisor returned no lints. These are tracked optimization/review items; no blanket index drops, RLS rewrites or policy consolidation. Detailed record: [GO_LIVE_PHASE_B38_PRODUCTION_ADVISOR_REVALIDATION_2026-11-20.md](./GO_LIVE_PHASE_B38_PRODUCTION_ADVISOR_REVALIDATION_2026-11-20.md).

B37 Auth acceptance has been clarified: user UUID/identity link and password-hash-presence evidence must match; session/refresh-token differences are acceptable if intentionally invalidated, with fresh sign-in tested. B28 owner runbook now documents this and the official Auth-schema recovery guidance. No production changes. Wave 0 remains blocked; production remains NO-GO.


## 38. Phase B39 – production Storage recovery revalidation (2026-11-20)

Fresh production Storage aggregate check: 0 buckets, 0 objects, 0 Storage RLS policies; all 10 Storage base tables have RLS enabled. The schema contains 11 non-internal managed Storage triggers relating to bucket/object lifecycle and protection; do not replay or modify these platform-managed objects as app migrations. The zero bucket/object baseline is valid only for this snapshot and must be rechecked immediately before the backup. If still zero, record it; if non-zero, export bucket config, object bytes, paths and metadata separately. Detailed record: [GO_LIVE_PHASE_B39_STORAGE_RECOVERY_REVALIDATION_2026-11-20.md](./GO_LIVE_PHASE_B39_STORAGE_RECOVERY_REVALIDATION_2026-11-20.md).

No Storage objects or metadata were exported or changed. Wave 0 remains blocked; production remains NO-GO.


## 39. Phase B40 – production Membership/Auth preflight and signup activation finding (2026-11-20)

Added and executed `v2/supabase/preflight/membership_auth_wave_preflight_read_only.sql`. Production snapshot: 3 profiles, all active (1 admin, 2 members, 0 managers), 3 Auth users, no orphan profile/Auth rows, no duplicate Auth email groups, 2 profile policies, RLS on, no anon profile SELECT, one Auth signup trigger. No IDs or email addresses were selected.

New high-priority finding: `profiles.active` has default `true`; `on_auth_user_created` calls `public.handle_new_auth_user()`, which inserts only id/display_name/role and omits active. Therefore, if project-level Auth signup is enabled, newly created profiles inherit active=true. `is_active_user()` checks active only; production has no `membership_status` column. The app's own account creation restriction does not prove project-level Auth signup is disabled; current Auth provider/signup setting was not accessible to the read-only tooling. Verify it owner-side. Wave 1 must set future `active` default false, explicitly create new profiles inactive/pending, and require active+approved in role helpers. Preserve the existing three account UUIDs/roles and test on isolated restore. Detailed record: [GO_LIVE_PHASE_B40_MEMBERSHIP_AUTH_PREFLIGHT_AND_SIGNUP_GATE_2026-11-20.md](./GO_LIVE_PHASE_B40_MEMBERSHIP_AUTH_PREFLIGHT_AND_SIGNUP_GATE_2026-11-20.md).

No production change or test signup. This strengthens the Wave 1 security requirement. Wave 0 remains blocked; production remains NO-GO.


## 40. Phase B41 – owner-side Auth provider/signup configuration checklist (2026-11-20)

Fresh aggregate identity inventory: all 3 existing identities use provider `email`; all 3 users are non-anonymous and non-SSO. This does not establish project-level Auth provider/signup settings. The connected read-only integration cannot inspect the Dashboard settings. Added [GO_LIVE_PHASE_B41_OWNER_AUTH_CONFIGURATION_CHECKLIST_2026-11-20.md](./GO_LIVE_PHASE_B41_OWNER_AUTH_CONFIGURATION_CHECKLIST_2026-11-20.md) for owner verification of email signup, anonymous sign-in, other providers, email confirmation, redirect URLs, SMTP, leaked-password protection, MFA and JWT expiry/signing-key type. Do not share secrets. Until Wave 1 fixes the `active DEFAULT true` trigger path, keep public signup disabled if self-service signup is not required. No settings changed.

B37 Auth baseline now records email-only identities; session/refresh-token differences remain acceptable only when intentionally invalidated and fresh sign-in is proven. Production remains NO-GO pending Wave 0.


## 41. Phase B42 – production profile RLS and grant boundary review (2026-11-20)

Fresh production policy/grant inspection: `profile_select_own_or_staff` permits SELECT only for self or admin/manager; `profile_update_staff` permits admin or admin/manager updating another member profile, with role constrained to member on the manager path. Authenticated has table SELECT/UPDATE only; no client INSERT/DELETE. Anon has no table grant. New profiles are created through the SECURITY DEFINER Auth trigger. Wave 1 must preserve these row and column boundaries, keep authenticated INSERT/DELETE absent, and use an explicit admin approval path. Detailed record: [GO_LIVE_PHASE_B42_PROFILE_RLS_AND_GRANT_BOUNDARY_2026-11-20.md](./GO_LIVE_PHASE_B42_PROFILE_RLS_AND_GRANT_BOUNDARY_2026-11-20.md).

No profile policies or grants changed. Production remains NO-GO pending Wave 0 and Wave 1 isolated rehearsal.


## 42. Phase B43 – Wave 1 production candidate and app enforcement alignment (2026-11-20)

Additional production preflight: no Auth user has a missing/blank email; no profile has NULL active or an invalid role; active roles remain 1 admin + 2 members; one Auth users trigger; `profiles.member_rank` is absent. Added the production-specific Wave 1 SQL candidate at `v2/supabase/candidates/wave1_membership_auth_production_candidate.sql`, deliberately outside the migration directory. It has a Wave 0 rehearsal tripwire and exact B40 baseline assertions; sets future active=false and membership_status=pending; preserves existing IDs/roles/active flags; creates new profiles pending/inactive; requires active+approved in all role helpers; preserves RLS; narrows authenticated UPDATE to the profile columns used by the app. This remains a draft, not run on production or TEST. Full detail: [GO_LIVE_PHASE_B43_WAVE1_CANDIDATE_AND_APP_ENFORCEMENT_2026-11-20.md](./GO_LIVE_PHASE_B43_WAVE1_CANDIDATE_AND_APP_ENFORCEMENT_2026-11-20.md).

Branch-only application changes: `isStaff()` requires approved membership; App routes unknown membership states to waiting/denied rather than normal member access; manager cannot edit self in Admin UI; music Edge Function requires approved+active; admin-delete Edge Function requires approved+active admin. Deploy the music function only after Wave 1 schema is present and tested. V2 PT Studio currently writes `profiles.member_rank`, but production lacks that column; track it as a PT-wave dependency, not Wave 1.

No database or Edge Function changes were applied. No preview/production deployment requested or performed in this phase. Wave 0 and owner Auth settings verification remain hard blockers; production remains NO-GO.


## 43. Phase B44 – centralized RLS membership gate coverage (2026-11-20)

Fresh production catalog query: 49 public policies; 38 reference `is_active_user()`, 39 reference `is_admin_or_manager()`, 3 reference `is_admin()` (overlapping); zero policy predicates directly reference profiles or membership_status. All 8 public functions inspected. `book_pt_session(uuid)` explicitly checks `auth.uid()` and `is_active_user()`; therefore it inherits the new approval gate. Signup trigger is the one Auth-user trigger and must create inactive/pending. Other public functions are capacity/waitlist/updated_at triggers. The current SECURITY DEFINER functions retain fixed search_path; no grant or function changed. Detailed report: [GO_LIVE_PHASE_B44_RLS_CENTRAL_MEMBERSHIP_GATE_REVIEW_2026-11-20.md](./GO_LIVE_PHASE_B44_RLS_CENTRAL_MEMBERSHIP_GATE_REVIEW_2026-11-20.md).

The three-helper approach can gate the existing policy set without a blanket rewrite, provided the current ACLs are preserved and all role/RPC combinations are tested on the isolated restore. No database changes. Production remains NO-GO pending Wave 0.


## 44. Phase B45 – membership access regression tests and candidate isolation guard (2026-11-20)

Centralized membership rules in `v2/src/lib/membershipAccess.js`; App, `isStaff()` and Admin manager edit permissions now share the same fail-closed behavior. Added membership access tests for approved/pending/rejected/inactive/missing/unknown status, admin/manager classification and manager self/privilege boundaries. Added candidate guard tests ensuring the production SQL draft remains outside `supabase/migrations`, contains Wave 0 tripwire/baseline/fail-closed checks, has balanced dollar quotes and contains no DROP TABLE/TRUNCATE/DELETE FROM. The candidate test is a static repository guard, not a PostgreSQL syntax/behavior test. Evidence: [GO_LIVE_PHASE_B45_MEMBERSHIP_ACCESS_REGRESSION_AND_CI_2026-11-20.md](./GO_LIVE_PHASE_B45_MEMBERSHIP_ACCESS_REGRESSION_AND_CI_2026-11-20.md).

On commit `47463c01088039b095023594220abbba584a4029`, STURMKOPF build/focused tests run `44831843048` and full checks run `44831843088` both completed SUCCESS. No database candidate execution, Edge Function deploy, preview/production publish or paid resource. Wave 0 remains blocked; production NO-GO.


## 45. Phase B46 – production non-interference checkpoint (2026-11-20)

Fresh read-only production snapshot after B43–B45: profiles 3 (all active), Auth users 3, classes 1, class bookings 1, legacy PT sessions 1, PT bookings 1, WODs 1, workout logs 0, personal records 1, Storage buckets/objects 0. `profiles.email` and `membership_status` remain absent. Production migration ledger remains 11; TEST remains 163. Production still has exactly one Edge Function, `garasjegym-music` ACTIVE v2, `verify_jwt=false`, deployed source SHA-256 unchanged at `3e369166c2c425c20c0e6af8e49adeaeef96c6e192479102f09a6acde1850e69`. Branch-only membership gate has not been deployed. Full checkpoint: [GO_LIVE_PHASE_B46_PRODUCTION_NONINTERFERENCE_CHECKPOINT_2026-11-20.md](./GO_LIVE_PHASE_B46_PRODUCTION_NONINTERFERENCE_CHECKPOINT_2026-11-20.md).

CI passed on code/test commit `47463c01088039b095023594220abbba584a4029` and subsequent B45 report commit `355d180a9398e1f6e274111e640872ae3b38459b`; latest preview workflow cancelled, no preview deployment. No production or TEST data/schema/Auth/function/secret/hosting changes. Wave 0 owner backup/restore and Auth settings verification remain hard blockers; production NO-GO.


## 46. Phase B47 – Wave 1 isolated Auth/RLS smoke matrix (2026-11-20)

Added `v2/supabase/preflight/wave1_membership_auth_smoke_matrix.md` with isolated admin, two existing members, pending, rejected, inactive and manager test identities. Defines positive/negative expectations for Auth session vs app access, own/other profile, WOD/exercise, workout/PR, class/PT bookings, admin approval, role/active changes, manager self/privilege boundaries, RPC helper behavior and music Edge Function. Tests must use separate JWTs through PostgREST/RPC, not SQL as postgres. Evidence must exclude credentials/PII. Detailed record: [GO_LIVE_PHASE_B47_WAVE1_ISOLATED_SMOKE_MATRIX_2026-11-20.md](./GO_LIVE_PHASE_B47_WAVE1_ISOLATED_SMOKE_MATRIX_2026-11-20.md).

Matrix is prepared only; no users or SQL were run. Wave 0 restore is required before execution. Production remains NO-GO.


## 47. Phase B48 – Wave 0 owner evidence handoff (2026-11-20)

Added `v2/supabase/preflight/wave0_owner_evidence_template.md` covering encrypted source backup, CLI/client versions, Auth user/identity/password-hash recovery, custom Auth trigger, Storage snapshot, project Auth/SMTP/redirect/JWT settings, isolated restore, row/UUID/role invariants, role/RLS functional smoke tests and owner approval of exact Wave 1 candidate hash. It prohibits secrets, credentials, tokens, email addresses, UUIDs and password hashes in the record; raw backup remains encrypted and outside GitHub. Full handoff: [GO_LIVE_PHASE_B48_WAVE0_OWNER_EVIDENCE_HANDOFF_2026-11-20.md](./GO_LIVE_PHASE_B48_WAVE0_OWNER_EVIDENCE_HANDOFF_2026-11-20.md).

The owner must perform the backup/restore on a trusted workstation or already-approved isolated target; connected tools cannot securely run the local Docker/CLI process or manage encrypted copies. Official Supabase Auth migration guidance supports moving users, identities and password hashes with a full backup or SQL export/import; different JWT secret invalidates existing tokens, so fresh sign-in must be tested. No backup/restore was performed. Wave 0 remains blocked; production NO-GO.


## 48. Phase B49 – Wave 1 candidate PostgreSQL 17.12 integration rehearsal (2026-11-20)

Added disposable PostgreSQL 17.12 fixture and assertions for the exact production-specific candidate. The runner created a minimal Auth schema/uid helper, three existing Auth/profile identities, the signup trigger, current SECURITY DEFINER helpers, production-shaped profile RLS and grants, then executed the candidate under the Wave 0 tripwire. The test verified existing three profiles remain active/role-preserved and become approved; new signup is inactive/pending; pending/rejected/inactive users fail authorization; member sees only own profile; admin can approve; manager can update another approved member's display name but cannot self-edit, promote, deactivate, change membership status or email; anon has no profile SELECT/helper execute; direct inserts default inactive/pending. Explicit log marker: `WAVE1_POSTGRES17_CANDIDATE_TESTS_PASSED`. Full result: [GO_LIVE_PHASE_B49_WAVE1_POSTGRES17_CANDIDATE_REHEARSAL_2026-11-20.md](./GO_LIVE_PHASE_B49_WAVE1_POSTGRES17_CANDIDATE_REHEARSAL_2026-11-20.md).

CI: sandbox run `44832677598` SUCCESS; integrated Postgres rehearsal + full build run `44832696323` SUCCESS; focused STURMKOPF build/test `44832696165` SUCCESS. This is PostgreSQL 17.12 syntax/logic validation against a mock fixture, not a Supabase restore, actual Auth service migration, real JWT/PostgREST test or production data-preservation proof. Production and TEST remain untouched. Wave 0 remains blocked; production NO-GO.


## 49. Phase B50 – signup conflict-path preservation test (2026-11-20)

Extended the PostgreSQL 17.12 candidate assertions to invoke the exact `handle_new_auth_user()` trigger function with an existing profile UUID and changed email/display name. It asserts the conflict path updates email only and preserves display_name, role, active and membership_status. Passed; log marker `WAVE1_POSTGRES17_CANDIDATE_TESTS_PASSED`. On commit `b3d2b9fcd57a00c7c2ef0fa7c62d02a822d66020`, full checks + disposable PostgreSQL job `44832920483` SUCCESS and STURMKOPF focused build/test `44832920459` SUCCESS. Detailed report: [GO_LIVE_PHASE_B50_SIGNUP_CONFLICT_PATH_PRESERVATION_2026-11-20.md](./GO_LIVE_PHASE_B50_SIGNUP_CONFLICT_PATH_PRESERVATION_2026-11-20.md).

This remains a PostgreSQL mock fixture, not an actual Supabase Auth/restore test. No production or TEST database changes. Wave 0 remains blocked; production NO-GO.


Wave 1 candidate revision pin: `v2/supabase/candidates/wave1_membership_auth_production_candidate.sql` currently has GitHub blob SHA `8e0227bb4fd7159a79635749bb8a91a09a4c7ebe` on the STURMKOPF branch. The Wave 0 owner evidence template now records this exact immutable file revision for approval. If the candidate changes, the owner must review and approve the new blob SHA; this identifier is not a SHA-256 backup checksum.


## 50. Phase B51 – exact candidate revision pin and regression guard (2026-11-20)

The Wave 0 owner template now pins the exact production Wave 1 candidate path and GitHub blob SHA `8e0227bb4fd7159a79635749bb8a91a09a4c7ebe`. `v2/scripts/membership-candidate.test.mjs` computes the Git blob SHA from checked-out file bytes and asserts the owner template contains the same value. First run correctly detected the template pin had not been updated; template was corrected and rerun passed. On commit `b2ded164d58342b4b85d85b5dbfb940d84ae6453`, full checks `44833279263` SUCCESS including exact-hash test + disposable PostgreSQL 17.12 candidate rehearsal; focused build/test `44833279235` SUCCESS; preview artifact build `44833279279` SUCCESS with deploy skipped. Detailed record: [GO_LIVE_PHASE_B51_CANDIDATE_REVISION_PIN_AND_CI_2026-11-20.md](./GO_LIVE_PHASE_B51_CANDIDATE_REVISION_PIN_AND_CI_2026-11-20.md).

No production/TEST changes or deployments. Wave 0 owner backup and actual Supabase restore remain blockers; production NO-GO.


## 51. Phase B52 – final production non-interference checkpoint (2026-11-20)

Fresh production aggregate SELECT after B49–B51: profiles 3 (all active), Auth users 3, classes 1, class bookings 1, legacy PT sessions 1, PT bookings 1, WODs 1, workout logs 0, personal records 1, Storage 0 buckets/0 objects. `profiles.email` and `membership_status` remain absent. Production migration ledger 11, TEST 163. Production Edge Functions remain exactly one: `garasjegym-music` ACTIVE v2, `verify_jwt=false`, source SHA-256 unchanged `3e369166c2c425c20c0e6af8e49adeaeef96c6e192479102f09a6acde1850e69`. Detailed checkpoint: [GO_LIVE_PHASE_B52_FINAL_NONINTERFERENCE_CHECKPOINT_2026-11-20.md](./GO_LIVE_PHASE_B52_FINAL_NONINTERFERENCE_CHECKPOINT_2026-11-20.md).

All Wave 1 candidate execution occurred in disposable PostgreSQL 17.12 GitHub Actions only. Candidate blob pin is enforced by automated test. No production or TEST changes. Owner-run encrypted backup, supported Auth recovery and actual isolated Supabase restore remain mandatory. Production remains NO-GO.


B52 CI result: full checks `44833454126` SUCCESS (includes the PostgreSQL 17.12 candidate rehearsal and full app bundle); focused STURMKOPF build/test `44833454064` SUCCESS; preview workflow `44833454049` cancelled, no deploy.
