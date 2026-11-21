# B88 – Clean-start SQL replay validation
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch: `garasjegym-2.0-sturm­kopf`
Validated commit: `eb5c6937f97de95b8634f24587de3c18112cdf77`

## Result: full isolated validation PASS
GitHub Actions [GarasjeGym 2.0 checks run 44889159062](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44889159062) completed successfully.

All four jobs passed:
- Application build.
- Disposable PostgreSQL 17 membership/Auth candidate rehearsal.
- Disposable PostgreSQL 17 trigger-function privilege rehearsal.
- Full local Supabase PostgreSQL 17 migration replay from an empty database.

The full replay job passed every step:
1. Ephemeral local Supabase stack start.
2. Complete versioned migration replay from empty database.
3. Exact reconciled exercise catalogue assertion (135 provisional manifest names).
4. Full schema, RPC grants and privacy policy checks.
5. Release Auth/RLS security contract.
6. Real Auth signup trigger and pending-member gate.
7. Execution of both read-only clean-start SQL scripts:
   - `clean_start_readiness_read_only.sql`
   - `clean_start_post_reset_acceptance_read_only.sql`
8. Ephemeral stack cleanup.

The standard build/test run [44889159017](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44889159017) passed. The production-target release candidate build-only run [44889159083](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44889159083) passed. Preview workflow [44889159026](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44889159026) passed its build; the actual deploy job was skipped.

## Important scope qualification
The CI clean-start step executes the read-only SQL files against the isolated, freshly migrated baseline and verifies that they run without SQL errors and produce output. It is a syntax/execution smoke test, **not** proof that a post-reset database contains exactly one owner identity or zero operational rows. The post-reset acceptance must still be run against a dedicated isolated clean-start rehearsal after the owner-admin creation and data-clear procedure have been rehearsed.

The 135-name catalogue is still provisional pending explicit semantic-alias and category review. The exact manifest assertion proves internal completeness and reproducibility, not final approval of possible semantic duplicates.

## Production and release state
- No Production schema, data, Auth identity, migration ledger, Edge Function or deployment was changed.
- No Production reset or app deployment was performed.
- No Production credentials or backup contents were added to CI.
- Production remains NO-GO until protected backup and isolated restore, post-reset clean-start rehearsal, final catalogue review, migration-lineage reconciliation, and Production-shaped security tests are complete.
- The owner must still give explicit final GO LIVE authorization before any Production reset or deployment.
