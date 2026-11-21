# B76 – Production-target build and live schema gate
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch: `garasjegym-2.0-sturm­kopf`
Commit: `6461fc057bb96c93c9e61e43fef5d9b28421605a`

## Work completed
### 1. Correct Production build target
Confirmed the live Production project:
- Supabase project ref: `kultdmklwmilhoytrrig`
- API URL: `https://kultdmklwmilhoytrrig.supabase.co`
- Project status: ACTIVE_HEALTHY, PostgreSQL 17.
- A currently enabled publishable client key was retrieved from Supabase and used only as a browser build-time value. No service-role/secret key was retrieved or placed in the client bundle or repository.

Added `.github/workflows/sturmkopf-production-candidate.yml`. This builds against the real Production URL and publishable key, runs regression tests, checks the production migration path, verifies the resulting bundle points to Production and contains no TEST project ref or service-role/secret material, then uploads a build artifact. It deliberately has no deployment or database mutation step.

Latest production-target build: [GitHub Actions run 44884740233](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44884740233) – success.
Artifact: `sturmkopf-feuer-1.1-production-target-candidate`, 387,882 bytes, SHA-256 `580b343d24e6e765c1883b4803d522e86484fe7363fbfd34cf3a275207087a43`. Artifact is retained until 2026-12-05.

### 2. Remove TEST-only migrations from the active production migration path
Moved the following three files out of `v2/supabase/migrations/` and into `v2/supabase/test-fixtures/migrations/`:
- `20261116225942_baseline_from_production_schema_no_data.sql`
- `20261116230108_test_seed_data.sql`
- `20261117090304_test_first_signup_admin_bootstrap.sql`

The disposable local Supabase PG17 workflow now copies these fixtures into its temporary migration directory only, before starting the local stack. They are no longer part of the repository's active production migration path.

Added `npm run check:production-migrations` to the regular verify workflow, ensuring TEST-only baseline/seed/bootstrap files cannot silently enter the production migration directory. The production-target build confirms this gate passes.

### 3. Live Production schema readiness check (read-only)
Added and executed:
`v2/supabase/preflight/production_release_readiness_read_only.sql`

It is read-only and makes no schema/data changes. Latest live result:
- Expected public tables: 46
- Present in Production: 18
- Missing public tables: 28
- Missing columns on existing Production tables: 3 (`profiles.email`, `profiles.membership_status`, `profiles.member_rank`)
- Expected app RPCs: 26
- Present in Production: 0 of those 26
- Existing Production public tables with RLS disabled: 0

Column-level comparison between current Production and TEST:
- Production columns: 173
- TEST columns: 509
- Shared columns: 173
- TEST-only columns absent from Production: 336
- Two shared-column definition differences were detected:
  - `exercises.body_area`: TEST is NOT NULL with default `'Fullkropp'`; Production is nullable with no default.
  - `workout_logs.result_data`: TEST is nullable; Production is NOT NULL with default `'{}'::jsonb`.

Production remains materially behind the app schema. A production-target frontend bundle can be built, but it cannot safely be launched against this schema.

### 4. Production Edge Function dependency
Production currently has only `garasjegym-music` deployed. The current app includes an `admin-delete-user` integration, but that Edge Function is not deployed to Production. The app's function checks also require the new membership columns. Do not deploy this function until its DB prerequisites, policy behaviour, and function secrets are rehearsed against the restored full schema. `admin-create-user` is intentionally disabled and must not be re-enabled without a separate security decision.

## Current release decision
**Production NO-GO. No Production deployment or DB mutation has been performed.**

Blocking:
1. 28 missing public tables, 336 missing TEST-side columns and 26 missing RPCs.
2. The three missing `profiles` columns are used by the current membership and admin checks.
3. `admin-delete-user` app dependency is not deployed to Production.
4. Exact historical lineage for the 11 current Production migration-ledger entries remains unverified.
5. Owner-run encrypted, Auth-preserving backup and isolated full restore are not complete.
6. Owner-admin login on the restored candidate is not verified.

## Latest validation
- Production-target build, full app regression suite, production migration-path guard and client bundle safety check: passed on this commit.
- The disposable local Supabase full replay workflow is running on this commit after moving the TEST-only fixtures out of the active migration path. It must finish and pass the 46-table/26-RPC/Auth-trigger contract checks before the migration workflow can be called green again.
- The existing preview workflow remains preview-only. It is not a Production deployment.

## Next safe sequence
1. Complete the latest disposable PG17 full replay after fixture separation.
2. Recover and reconcile the 11 Production migration ledger entries against actual source SQL and schema state.
3. Produce a reviewed, additive production migration plan based on the live Production snapshot. Do not replay the TEST baseline or seed in Production.
4. Rehearse that exact plan against a Production-derived isolated restore, including all 28 tables, columns, constraints, indexes, functions, triggers, grants, RLS policies, RPCs and Edge Function dependencies.
5. Owner performs Auth-preserving encrypted backup/restore and admin sign-in verification.
6. Only then, with owner approval, apply the migration plan and perform the clean-start reset/deployment.

No users, profile rows, exercise rows, WODs, bookings, history, Auth identities, functions, policies or grants have been changed in Production.
