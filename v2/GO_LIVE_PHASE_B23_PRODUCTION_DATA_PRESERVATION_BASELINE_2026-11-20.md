# GO LIVE Phase B23 – production data-preservation baseline

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Capture:** 2026-11-20 22:16:27 UTC  
**Decision:** READ-ONLY BASELINE CAPTURED; MIGRATION EXECUTION STILL BLOCKED

## 1. Production baseline

A single aggregate-only SELECT was executed against production project `kultdmklwmilhoytrrig`. No names, emails, IDs, notes, tokens or other member-level data were retrieved.

| Object | Current count |
|---|---:|
| Profiles | 3 |
| Active profiles | 3 |
| Admin profiles | 1 |
| Member profiles | 2 |
| Classes | 1 |
| Class bookings – confirmed | 1 |
| PT sessions | 1 |
| PT bookings | 1 |
| PT client notes | 0 |
| PT messages | 0 |
| PT requests | 0 |
| WODs | 1 |
| Workout logs | 0 |
| Workout exercises | 0 |
| Workout sets | 0 |
| Personal records | 1 |
| Social posts | 0 |
| Social comments | 0 |
| Auth users | 3 |
| Auth identities | 3 |
| Auth sessions | 12 |
| Storage buckets | 0 |
| Storage objects | 0 |

The separate PR linkage aggregate confirms the one existing personal record has no linked workout log. It is a standalone PR and must remain so; do not invent or attach a workout during migration.

## 2. Data preservation requirements

Any future production migration must preserve:
- All 3 profile/Auth UUID relationships and existing roles.
- The existing class and confirmed booking.
- The legacy PT session and booking.
- The existing WOD and standalone personal record.
- Existing production constraints, indexes and policies unless a reviewed, tested replacement is explicitly approved.
- `workout_logs.result_data` NOT NULL/default semantics as established in earlier schema comparison.

No seed/demo data from the isolated test environment may be inserted into production. The test migration `20261116230108_test_seed_data.sql` explicitly inserts demo exercises, a demo WOD, coffee products and a demo class. It is TEST ONLY.

The test bootstrap migration `20261117090304_test_first_signup_admin_bootstrap.sql` assigns the first newly registered account the admin role if no admin exists. This is unsafe for production and must never be replayed.

The test baseline migration `20261116225942_baseline_from_production_schema_no_data.sql` is a schema-only test baseline, not a production migration. The test migration ledger is independent of production's 11-entry ledger; do not replay the 163-entry test chain.

## 3. Latest CI / preview evidence

For B22 commit `bfed0bbf753bff31a355dfbd3b1b6b28e82d167d`:
- STURMKOPF focused build/test: SUCCESS.
- Full GarasjeGym 2.0 checks: SUCCESS.
- Pages preview build: SUCCESS (run attempt 2).
- Pages deploy job: SKIPPED.
- No Pages publication or production deployment occurred.

## 4. Wave 0 recovery status

This baseline is not a backup. It cannot be used to restore the project. The Free-plan recovery path still requires an owner-run encrypted logical database export, separate Auth/Storage recovery coverage, checksum verification and successful isolated restore rehearsal. The test project is not an approved restore target.

## 5. Execution boundary

The only production operations in this phase were aggregate-only SELECT queries. No DDL, DML, migration, Auth/Storage operation, Edge Function change, secret change, deployment or paid resource was performed.

**B23 result:** Current production data footprint is captured as a privacy-safe baseline and explicit preservation contract. Test seed/bootstrap migrations are flagged as prohibited for production replay. Wave 0 remains NOT PASSED and production remains **NO-GO**.
