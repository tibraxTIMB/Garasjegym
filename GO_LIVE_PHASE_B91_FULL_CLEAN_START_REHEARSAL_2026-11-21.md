# B91 – Full clean-start transaction rehearsal and measurement-rule correction
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Validated code commit: `323fdd063e2960374a825f8f287eb1a755840dbe`

## Full clean-start rehearsal PASS
GitHub Actions [GarasjeGym 2.0 checks run 44890829031](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44890829031) completed successfully. All four jobs passed:
- Application build and tests.
- PostgreSQL 17 membership/Auth candidate rehearsal.
- PostgreSQL 17 trigger-function privilege rehearsal.
- Full local Supabase PostgreSQL 17 replay and clean-start rehearsal.

The full replay job passed:
1. Start an isolated local Supabase stack.
2. Replay the complete migration chain from an empty database.
3. Verify the exact 135-name provisional system exercise manifest, all seven categories, Pilates and body-area data.
4. Verify the 46-table schema, RPC grants and privacy policies.
5. Verify release Auth/RLS security contract.
6. Verify real Auth signup creates an inactive pending member.
7. Run the guarded clean-start reset in an explicit rollback transaction.
8. Create one synthetic, confirmed email Auth identity and profile.
9. Run the owner-admin bootstrap template; it promotes only the sole pending profile to active approved admin.
10. Run the fail-closed post-reset acceptance guard and exact exercise manifest assertion.
11. Run the pre-reset readiness inventory.
12. Roll back the transaction and stop the ephemeral Supabase stack.

The job log explicitly confirms:
- `Isolated clean-start reset passed: 135 system exercises retained; all legacy Auth/profile and operational rows cleared.`
- `Owner admin profile bootstrapped for the sole confirmed Auth user.`
- `Catalogue acceptance passed: 135 exact system exercises, all seven categories, Pilates retained, body_area populated, no duplicates.`

The post-reset acceptance guard also verifies exactly one approved active admin profile, one Auth user, one identity, no non-admin profiles, no operational rows in the 44 operational tables, no custom exercises, no Storage objects, and no Auth sessions, refresh tokens or MFA factors/challenges at the pre-login acceptance point.

## Important scope
This is a transactionally rolled-back rehearsal against the isolated local Supabase stack, not a reset of TEST or Production. The reset SQL is guarded by `app.clean_start_target='isolated-rehearsal'` and must never be used on Production. Any eventual Production Auth deletion must use the Supabase Auth Admin API/Dashboard under a separately reviewed Production runbook after explicit owner GO LIVE approval.

## Plyo-box measurement correction
The measurement resolver and unit tests were corrected:
- Unweighted `Box Step-up` with `Plyoboks` records height only.
- Plain `Step-up` with `Kasse` records height only.
- `Dumbbell Step-up` with `Manualar / kasse` records height in cm and load in kg.
- Existing Box Jump and Box Step-over height rules remain intact.
The STURMKOPF build/test run [44890829116](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44890829116) passed, including the exercise height/load measurement tests.

## Build status
- STURMKOPF build/test: [44890829116](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44890829116) – success.
- Production-target build-only: [44890829110](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44890829110) – success; no deployment.
- Preview workflow: [44890829091](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44890829091) – build passed; deploy job skipped.

## Production remains NO-GO
No Production schema, data, Auth, function, setting, migration ledger or deployment was changed. Remaining release gates:
- Owner-run protected Production backup and Auth-complete isolated restore/rollback login.
- Recover exact 11-entry Production migration lineage or derive and rehearse forward-only reconciliation from the verified Production restore.
- Reconcile Production's 46-table schema, membership helper functions, PT booking boundary and RLS policy drift; the Production security contract previously failed 8/8 assertions.
- Deploy `admin-delete-user` with JWT verification enabled after schema reconciliation and function authorization tests; it is missing in Production although the current app invokes it. Keep `admin-create-user` disabled.
- Disable public Auth signups in Supabase Auth General configuration; verify invitation-only dashboard flow and pending-member approval. Current Production setting remains unverified.
- Enable leaked-password protection.
- Review semantic exercise aliases and category mapping; 135 remains provisional.
- Complete isolated Production-restore clean-start rehearsal and final owner review.
- Receive separate explicit final owner GO LIVE authorization.

**Status: full local clean-start rehearsal PASS; Production remains NO-GO.**
