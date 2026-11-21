# B75 – SturmKopf Feuer 1.1: six-step GO LIVE execution result
Date: 2026-11-21
Branch: `garasjegym-2.0-sturm­kopf`
Verified branch head at audit close: `550b3df587adceeae8f62a143ee7835a9a3de963`

## Executive decision
The clean local Supabase PostgreSQL 17 migration replay and all automated contract/fixture checks passed on the same commit. Application build and STURMKOPF preview workflow also passed.

Production remains **NO-GO**. Steps 1–4 are partially/completely prepared as described below; steps 5 and 6 cannot be safely completed in this environment without an owner-run Auth-preserving backup/restore and owner login verification. No Production database, Auth user, Edge Function, RLS policy, grant, data row, migration ledger or release deployment was changed.

## Workflow evidence
All three latest workflows completed successfully on `550b3df587adceeae8f62a143ee7835a9a3de963`:
- GarasjeGym 2.0 checks: [run 44842360509](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44842360509)
- STURMKOPF build and test: [run 44842360471](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44842360471)
- STURMKOPF preview build/deploy: [run 44842360451](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44842360451) – preview only; this is not a Production deployment.

The full clean Supabase PG17 job passed all steps:
1. Install pinned Supabase CLI 3.2.0.
2. Start an isolated Supabase stack with a dedicated port range.
3. Apply the full versioned migration chain from an empty database using `supabase db reset`.
4. Verify the 46-table schema and RLS, the 26 app RPC names and grants, anon table/function privilege boundaries and the two privacy-critical class/PT read policies.
5. Insert a synthetic Auth user into the local `auth.users` table, prove the actual signup trigger creates a member profile with `active=false` and `membership_status='pending'`, and verify that pending user is not active or staff. The fixture is rolled back.
6. Stop the disposable Supabase stack cleanly.

The same checks workflow also passed the isolated PostgreSQL 17 Wave 1 membership/Auth assertions and trigger-function direct-EXECUTE revocation assertions. The app build/test workflow passed, including the current WOD ordering, timer, mobile gesture, Spotify-device and Bluetooth pulse test suites.

## Step 1 – Production migration lineage and dependency map
**Status: partially reconciled; historical source recovery remains open.**

- Production has 11 migration ledger rows; v2 contains 164 versioned SQL migration files.
- No Production ledger version matches an exact filename version in the active v2 migration directory.
- Candidate source mappings and their evidence are documented in B73/B74. Some live catalog states match the intended current migrations, but the original SQL bytes/hashes and exact order for all 11 Production entries have not been recovered conclusively.
- The TEST foreign-key graph contains 95 dependency edges and is acyclic. A topological object-creation order is recorded in B73.
- The clean replay uncovered and fixed three genuine ordering/source defects: absent `daily_wod` source migration in v2; premature grant/revoke statements for `reorder_pt_program_sessions`; and use of `profiles.membership_status` before the column existed.

Do not manually rewrite the Production migration ledger, replay the TEST baseline/seed/bootstrap migrations into Production, or treat a name/intent mapping as recovery of the original SQL.

## Step 2 – Full schema migration rehearsal
**Status: passed in disposable local Supabase PG17.**

- All 164 active v2 migration files replayed from an empty local database.
- All 46 expected public tables were present and RLS-enabled.
- All 26 named app RPCs existed; authenticated execution was granted and anon execution denied.
- Anon had no public table CRUD privileges.
- Attached trigger functions were not directly executable by client roles.
- Class booking and PT session read policies contained the owner/staff and private coach/booking boundaries.
- Real local Auth signup trigger produced an inactive pending member.

This is a full clean migration replay and contract check, not a restore of the live Production database. It does not certify that the Production SQL ledger is historically exact.

## Step 3 – Application integration and privacy
**Status: strong database contract/targeted test coverage passed; complete end-to-end acceptance remains open.**

Passed:
- Application build and automated unit/regression tests.
- 26 critical app RPCs and role grants in the full local database.
- Membership approval and pending-user access boundaries.
- Member A/B class booking isolation, public PT slot visibility, own PT booking visibility, private PT session boundaries, assigned-coach visibility and admin visibility in the dedicated fixture.
- Direct invocation of trigger-only functions denied while existing triggers still execute.

Still to verify in the restored app:
- Complete browser/tablet/mobile workflows against the full restored schema, not merely the contract queries and isolated fixtures.
- Production Edge Function alignment: Production currently contains only `garasjegym-music`; TEST also contains `admin-delete-user`. The current app invokes `admin-delete-user`, so this dependency must be reviewed and securely deployed/tested after the database is ready. `admin-create-user` is intentionally disabled (HTTP 410) and must remain disabled unless product requirements change. The music function appears unused by the current client-side Spotify OAuth component; confirm whether it should be retained or retired.
- Review Production security/performance advisor findings and Auth leaked-password protection before release.

## Step 4 – Backup and restore preparation
**Status: runbook prepared; actual backup and isolated restore not completed.**

Runbook:
`v2/GO_LIVE_OWNER_BACKUP_RESTORE_AND_ADMIN_CHECKLIST.md`

Important constraints:
- Standard Supabase CLI `db dump` excludes managed schemas such as `auth` and `storage`, and default dump omits data and custom roles. The three SQL dumps alone do not prove Auth accounts/password hashes/identities/MFA can be restored.
- Supabase's current “Restore to a new project” clone feature can copy Auth user data and hashed passwords, but it is beta, requires a paid plan and physical backups enabled on the source. It is not assumed available under the zero-budget constraint.
- Production currently has zero Storage buckets and zero Storage objects, confirmed read-only. This reduces the present Storage data surface but does not replace a full backup/config inventory.
- The owner must prove a genuinely restorable Auth-preserving backup method in an isolated, compatible Supabase environment. If the available free-plan tools cannot produce and restore this securely without a paid project, keep Production unchanged.

No encrypted owner backup or Auth-preserving full restore has been performed by this workflow.

## Step 5 – Owner admin login and access verification
**Status: not performed; owner action required.**

The Production owner-admin identity has not been changed, deleted, disabled or replaced. A database fixture proves the new-member pending gate, but it is not a login using the owner's actual credentials. Only the owner can verify sign-in, logout/login, admin permissions and recovery/MFA in the isolated restored app. Keep the single existing Production admin intact until this is completed.

## Step 6 – Clean-start preparation and reset
**Status: reset plan and read-only acceptance queries prepared; reset not performed.**

The clean-start contract is:
- Exactly one verified owner admin / Auth identity.
- Preserve the original 56 Production system exercise name/category pairs (CrossFit 30, Pilates 15, Styrke 11); no custom exercises.
- Retain the one safe `coffee_settings` singleton.
- Clear all 43 operational public tables, including PT messages and WODs, plus linked Auth identities for non-owner users only after an approved dependency-aware reset.
- Retain schema, functions, triggers, constraints, indexes, RLS policies, grants and project configuration.

Read-only pre-reset and post-reset scripts are prepared:
- `v2/supabase/preflight/clean_start_readiness_read_only.sql`
- `v2/supabase/preflight/clean_start_post_reset_acceptance_read_only.sql`

Their syntax was checked against the existing TEST database. The post-reset acceptance correctly reports FAIL on that populated TEST database; this is expected and is not evidence that TEST or Production was reset. The exact Production 56-name contract is in the scripts. The current TEST exercise seed has 94 system rows and is not a safe proxy for Production's original catalogue.

No operational data or Auth identities have been deleted or reset in Production or TEST.

## Read-only Production state at audit close
A final aggregate query confirmed:
- Migration ledger: 11 rows
- Public base tables: 18
- Public columns: 173
- Profiles: 3
- Auth users: 3
- Exercises: 56
- WODs: 1
- Public RLS policies: 49
- Storage buckets: 0
- Storage objects: 0

This matches the earlier known Production baseline. The Production database remains unchanged by this workstream.

## Remaining blockers before GO
1. Recover/reconcile exact historical SQL lineage for the 11 Production migration entries, or explicitly document and independently approve any reconstructed equivalent.
2. Perform an owner-run encrypted backup that preserves restorable Auth identities/credentials; perform an isolated full restore.
3. Run the full restored app's role-based functional acceptance, including Edge Function dependencies.
4. Have the owner sign in and verify the one admin account in the isolated restored app.
5. Obtain owner approval, then run the dependency-aware clean start and verify every post-reset acceptance assertion.
6. Only after all above: schedule/approve the Production migration and deployment.

**Decision: Production NO-GO. Preview and disposable PG17 tests are green; production reset and release were not run.**
