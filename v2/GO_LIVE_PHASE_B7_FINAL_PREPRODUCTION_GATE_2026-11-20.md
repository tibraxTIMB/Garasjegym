# GO LIVE Phase B7 – final pre-production gate and execution boundary

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** READY FOR ISOLATED REHEARSAL PREPARATION; NOT READY FOR PRODUCTION

## 1. Latest CI results

The following runs were checked after the B6 report commit `188212a5a6d8b90a848b0a8edfc91e86bc23b36c`:

| Workflow | Run | Result |
|---|---:|---|
| GarasjeGym 2.0 checks (Node 20, full `npm test`, build) | 44825668762 | SUCCESS |
| STURMKOPF build and focused test suite (Node 22) | 44825668913 | SUCCESS |
| STURMKOPF Pages preview build | 44825668830 | CANCELLED |

The two verification workflows completed successfully, including dependency installation, migration checks, automated tests and production bundle build. The preview workflow was cancelled during dependency installation; its deploy job was cancelled/skipped. No Pages deployment occurred.

The Pages workflow uses TEST Supabase credentials and would publish to the shared Pages URL only on manual dispatch with `publish_preview=true`. It is not a production deployment workflow.

## 2. Work completed and remaining execution gates

| Workstream | State | Next safe action |
|---|---|---|
| Branch CI/build and focused automated tests | PASS | Preserve tested commit |
| Production schema reconciliation | BLOCKER | Produce production-derived migration units; do not replay test history |
| Profile/Auth membership | BLOCKER | Define account backfill and admin recovery, then rehearse |
| Class booking/waitlist/attendance | BLOCKER | Reconcile schema, constraints, RPCs, locks and policies as one unit |
| PT Studio | BLOCKER | Build dependency-ordered table/RPC/RLS migration; preserve legacy PT data |
| WOD/workout/PR | BLOCKER | Map save/log/PR RPCs and prove data compatibility |
| Member deletion Edge Function | BLOCKER | Rebuild reference map against production schema; do not deploy test function unchanged |
| Backup/PITR and restore rehearsal | HARD STOP | Owner evidence plus isolated restore route |
| Production security | OPEN | Review each RPC and Auth setting with role-based tests |
| Production release approval | NOT RECORDED | Explicit owner authorization after all gates pass |

## 3. Why no further production step is safe

The production app dependency audit established that the current frontend requests profile columns absent from production and uses PT Studio/class live-training tables and RPCs absent from production. A frontend-only deployment could fail at profile bootstrap and core workflows. Test migration history is not a valid production migration chain.

Wave 0 recovery evidence is still absent. Without a verified recovery point and isolated restore/rehearsal, production DDL, data backfill, Auth changes, Edge Function deployment and hosting deployment remain prohibited by the release controls.

## 4. Rehearsal package requirements

Before any production change, prepare and validate separate migration units in dependency order:

1. **Membership/Auth:** profile columns, reviewed account mapping, safe email sync, signup trigger, role helper functions, RLS/grants, and existing admin recovery.
2. **Class booking:** status/attendance fields, duplicate-booking preflight, constraints/indexes, row-locking capacity logic, cancellation, waitlist promotion and notifications.
3. **PT foundation:** coach registry/assignments/services/requests, intake/goals/templates/programmes/sessions/check-ins, RPCs and RLS. Preserve existing `pt_sessions` and `pt_bookings`.
4. **WOD/workout:** WOD assignment/save paths, workout links, PR recording, exercise metadata and result payload compatibility.
5. **Optional integrations:** calendar, notifications, coffee bar/social only after core release acceptance.
6. **Delete-user function:** schema-specific reference checks, authenticated admin authorization and no self/admin deletion.

Every unit must include: preflight SELECT checks; explicit assumptions; migration SQL; post-migration assertions; member/coach/manager/admin role tests; concurrency tests where relevant; data-preservation checks; and a tested rollback or forward-fix plan. Do not use the 163-entry test migration ledger as a production replay script.

## 5. Execution boundary

**Permitted now:** source inspection, migration authoring on the isolated branch, CI tests, static SQL checks, read-only production inspection, and documentation.

**Not permitted yet:** production DDL/DML, Auth trigger or policy changes, production Edge Function/secrets changes, production hosting deploy, or creating billable restore resources without explicit cost disclosure and approval.

**B7 outcome:** automated application verification is green. Production readiness remains NO-GO until recovery, schema compatibility, rehearsals, security acceptance and owner GO LIVE authorization are all evidenced. No production or test database changes were made in this phase.
