# GO LIVE – Phase B2 definition-level reconciliation

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Branch:** `garasjegym-2.0-sturm­kopf`  
**Status:** NO-GO – live catalog comparison and critical function/Edge Function review complete; backup/restore and production migration rehearsal remain blocked.

This phase used read-only catalog queries against the live production and test projects. No database, Auth, Edge Function or deployment changes were made.

## 1. Fresh object inventory

| Object | Production | Test | Test-only | Production-only | Changed definitions |
|---|---:|---:|---:|---:|---:|
| Columns | 173 | 509 | 336 | 0 | 2 |
| Constraints | 70 | 226 | 156 | 0 | 1 |
| RLS policies | 49 | 144 | 104 | 9 | 34 |
| Indexes | 38 | 181 | 144 | 1 | 0 |
| Triggers | 7 | 53 | 48 | 2 | 0 |
| Public functions | 8 | 75 | 67 | 0 | 7 |
| Public views | 1 | 1 | 0 | 0 | 0 |

These counts are a fresh live catalog capture and supersede earlier estimates in the Phase A notes and the initial B1 snapshot. Definitions were compared by stable object identity and normalized catalog fields.

### Two changed column definitions

- `exercises.body_area`: production allows NULL and has no default; test is NOT NULL with default `'Fullkropp'`.
- `workout_logs.result_data`: production is NOT NULL with default `'{}'::jsonb`; test allows NULL and has no default.

Do not copy either definition blindly. App insert/update compatibility and historical data behavior must be tested first.

### Changed constraint

- `class_bookings_status_check`: test adds `waitlist` to the permitted status values. Production does not currently permit it.

### Policy and index/trigger drift

- 34 policies have changed definitions; 104 exist only in test and 9 only in production. The production-only policies need explicit review rather than automatic deletion.
- 144 indexes exist only in test; one index exists only in production. The production-only active-booking uniqueness behavior must be preserved or deliberately replaced after row-level validation.
- 48 triggers exist only in test; two exist only in production. Trigger identities that differ between projects need a behavior-level comparison; the inventory count alone is not a safe migration plan.

## 2. Critical function behavior comparison

All seven shared production functions whose definitions differ were inspected. The functions retain fixed `search_path=pg_catalog, public, pg_temp` in both projects, but their authorization and workflow behavior is not equivalent.

### Signup and membership approval – high priority

Production `handle_new_auth_user()` inserts a profile with role `member` and relies on the production profile default `active=true`. It does not set an approval status.

Test `handle_new_auth_user()` inserts a profile with `active=false`, `membership_status='pending'`, and email. On conflict it only updates email.

Test `is_active_user()`, `is_admin()` and `is_admin_or_manager()` require both active status and `membership_status='approved'`. Production versions only check `active` and role.

**Release implication:** the test signup/approval gate is a security-relevant behavioral change. It must be brought forward deliberately, with existing-member backfill rules and a tested admin bootstrap/recovery path. Do not simply apply the test function before defining how current production members become approved.

### PT booking – private-session guard

Production `book_pt_session()` accepts a published PT session without excluding a session already linked to a client. Test additionally requires `client_id IS NULL`, preventing private client appointments from appearing as public bookable inventory. Both versions check active membership, future time, duplicate booking and capacity.

**Release implication:** carry the client-linked-session exclusion into the production target and test member/staff access.

### Group-class capacity – concurrency and waitlist

Production `check_class_booking_capacity()` reads class capacity without locking the class row. Test locks the class row with `FOR UPDATE` and rejects a waitlist insert if there is still capacity. The class status constraint in test also includes `waitlist`.

**Release implication:** this is a transactional/concurrency change. Validate simultaneous booking attempts, capacity boundaries, cancellation and waitlist transitions before applying it.

### PT waitlist promotion and notifications

Production `pt_promote_waitlist_after_cancel()` promotes the earliest waitlisted booking when a booked user cancels, but does not enforce the test's future/published-session guard or send the promotion notification.

Test only promotes for a published session whose start time is still in the future, locks the next waitlisted row with `FOR UPDATE SKIP LOCKED`, and inserts a deduplicated member notification.

**Release implication:** test race conditions, duplicate promotion, cancellation after session start, notification delivery and historical booking preservation.

## 3. Edge Function parity – explicit release blocker

Live Edge Function inventory:

| Project | Function | Status | JWT verification |
|---|---|---|---|
| Production | `garasjegym-music` | Active v2 | false |
| Test | `admin-delete-user` | Active v2 | true |
| Test | `admin-create-user` | Active v2 | true |

Production currently has no `admin-delete-user` or `admin-create-user` Edge Function. Test has both.

The test `admin-create-user` endpoint intentionally returns HTTP 410 and states that account creation is disabled. It should not be treated as a feature to deploy.

The test `admin-delete-user` endpoint requires a valid caller token and an active admin profile, prevents self-deletion and admin deletion, checks a set of historical references, and only then calls Auth admin deletion. However, its reference-check list includes tables/columns that do not yet exist in production. **Do not deploy the test function unchanged.** Reconcile it against the final production schema, check all FK/reference behavior, preserve historical records, and test the UI call path before deployment.

The production music function is a separate existing integration and must be preserved. Its JWT verification setting and external Soundtrack secrets require a dedicated configuration review; do not change it as part of the database migration.

## 4. Security and view parity

The prior B1 read-only SQL check remains current for this phase:

- Production: 18/18 tables RLS enabled; no direct anon table grants; no anon EXECUTE on public SECURITY DEFINER functions; no missing fixed search_path.
- Test: 46/46 tables RLS enabled; same zero-anon-grant/execute and fixed-search-path checks.
- The `pt_session_capacity` view definition hash and `security_invoker=true` option match in both projects; anon has no SELECT and authenticated has SELECT.
- Production Security Advisor still warns about four authenticated SECURITY DEFINER functions and disabled leaked-password protection. Keep the reviewed RPC allowlist; do not blanket-convert functions.

## 5. Production migration design requirements

The production-forward sequence must explicitly handle, in dependency order:

1. Profile membership approval columns and safe backfill for existing production members.
2. New feature tables and their foreign keys, with no test seed data.
3. New columns and compatible defaults, including HR preferences defaulting false.
4. RLS policies, preserving least-privilege member/admin/manager/coach boundaries.
5. Atomic booking, waitlist and notification triggers with concurrency tests.
6. RPC definitions and grants, including explicit function-by-function authorization review.
7. Edge Function deployment/configuration as a separate controlled step.
8. Indexes and constraints only after duplicate/null/orphan checks against live production rows.
9. Post-migration row counts, FK integrity, policy tests and app smoke tests.

The 163 test migrations must not be replayed into production. The production migration history remains a separate 11-version ledger whose original SQL sources are not present in the V2 migration directory.

## 6. Next gate

Still required before any production DDL:

- Owner/operator confirms production PITR/backup entitlement, retention and timestamp of a fresh recoverable restore point in Supabase Dashboard.
- Restore that backup into an isolated rehearsal environment. No new paid project/branch may be created without cost disclosure and explicit approval.
- Archive/reconstruct the 11 production migration sources.
- Build and rehearse a production-derived forward-only migration set.
- Reconcile Edge Functions and secrets without exposing service-role credentials.
- Pass the full application/SQL regression suite on the exact release SHA.

**Phase B2 complete:** live catalog and critical behavior review recorded.  
**Release remains NO-GO.** No production or test changes, backup, restore, migration or deployment was performed.
