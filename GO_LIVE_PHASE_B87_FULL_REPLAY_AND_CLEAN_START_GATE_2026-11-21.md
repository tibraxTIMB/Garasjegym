# B87 – Full clean replay and clean-start backup gate update
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch: `garasjegym-2.0-sturm­kopf`

## Result: isolated full migration replay passed
GitHub Actions run [44888640751](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44888640751) completed successfully on commit `d77853edbc06b5810d0e56e338248f1df42c4e56`.

All four jobs passed:
1. Disposable PostgreSQL 17 Wave 1 Membership/Auth candidate rehearsal.
2. Application build, migration delimiter check, tests and isolated TEST bundle.
3. Disposable PostgreSQL 17 trigger-function privilege rehearsal.
4. Clean local Supabase PostgreSQL 17 full migration replay from an empty database.

The full replay job completed every step successfully:
- Started isolated Supabase stack.
- Replayed the complete versioned migration chain from an empty database.
- Verified the exact reconciled exercise catalogue assertion (all 135 provisional manifest names, no missing or unexpected names, categories and body-area requirements).
- Verified full schema, RPC grants and privacy policies.
- Verified release Auth and RLS security contract.
- Verified real Auth signup trigger and pending-member gate.
- Stopped the ephemeral stack.

The 135-name catalogue remains provisional until semantic-alias and category review is signed off. The CI assertion proves the current manifest is internally complete and reproducible; it does not decide whether possible semantic duplicates should be merged or whether category precedence is ideal.

## Other verified release-candidate checks
On the same migration commit:
- STURMKOPF build/test run [44888640754](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44888640754): success.
- Production-target build-only run [44888640764](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44888640764): success. This was a build and artifact safety check, not a Production deployment.
- Preview build run [44888640768](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44888640768): build success; deployment job was skipped.

The subsequent documentation-only commit `7e831f2241a13859a2bd112cec67522897d0c27f` corrected B81 so its detailed restore and clean-start steps no longer contradict the binding clean-start contract. Its normal STURMKOPF build/test workflow was still running when this report was written.

## B81 runbook correction
The B81 zero-cost backup and restore runbook now explicitly distinguishes:
- Protected Production backup and isolated restore as rollback protection (including verification that the old owner/admin can still log in to the isolated restored copy).
- The clean-start result as a separate rehearsed operation: remove legacy Auth identities and operational history, create exactly one new owner-controlled admin, keep application modules/schema/security, and preserve the reviewed complete exercise catalogue.
- No legacy 56-exercise assumption, no carry-over of legacy coffee settings, and no retention of old admin/member identities in the clean-start result.
- The current 135-name catalogue as provisional pending semantic-alias/category review.
- Production migration lineage as unresolved until exact source migrations are recovered or a forward-only reconciliation is derived from a verified Production restore.

## Production status
No Production migration was applied or recorded. No Production schema, RLS, Auth, user, exercise or operational data was changed. No reset, Edge Function deploy or app deploy was performed. The catalogue SQL rehearsal previously ran inside explicit rollback transactions only.

## Remaining NO-GO gates
1. Owner-run protected Production backup, with Auth/schema/data/config completeness verified locally.
2. Free isolated restore rehearsal and rollback login verification.
3. Clean-start rehearsal on the isolated restored copy, including the new owner admin and zero legacy operational history.
4. Semantic-alias decisions and category mapping approval for the exercise catalogue.
5. Recovery of the exact 11-entry Production migration lineage or a documented forward-only reconciliation rehearsed against the isolated Production restore.
6. Production-shaped security and data-isolation tests for the actual Production schema, including class visibility, PT client/coach access and assigned-coach permissions.
7. Edge Function/integration dependency reconciliation and final owner GO LIVE authorization.

**Status: isolated code and migration-chain validation PASS; Production remains NO-GO.**
