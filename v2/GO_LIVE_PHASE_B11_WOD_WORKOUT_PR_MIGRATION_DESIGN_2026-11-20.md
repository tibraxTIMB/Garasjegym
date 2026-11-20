# GO LIVE Phase B11 – WOD, workout logging and PR migration design

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** WOD/WORKOUT/PR DESIGN READY FOR ISOLATED REHEARSAL; PRODUCTION NO-GO

## 1. Existing production data (read-only)

| Table | Rows |
|---|---:|
| `wods` | 1 |
| `workout_logs` | 0 |
| `workout_exercises` | 0 |
| `workout_sets` | 0 |
| `personal_records` | 1 |

The one existing PR has `workout_log_id IS NULL`. It is a standalone historical PR and must remain standalone. Do not backfill a synthetic workout log or attach it to an arbitrary WOD. This is an explicit preservation case for the migration/rehearsal.

Production already has structured WOD/timer and exercise-prescription metadata, but does not have the full V2 workout-save and PR RPC surface. The app calls `save_workout_with_pt_links` and `record_workout_prs`; those functions and their dependencies must be added in the correct order.

## 2. Migration source review

Inspected:

- `20261116225954_save_workout_atomic.sql`
- `20261117211846_atomic_workout_result_save.sql`
- `20261119095912_atomic_workout_pt_linkage.sql`
- `20261120164851_personal_record_workout_integrity.sql`

The source establishes a useful design: transactional workout save, exercise/set child rows, structured score payload, PT assignment/programme completion linkage, PR ownership validation, idempotent PR uniqueness and serialized PR comparison.

It cannot be applied unchanged because production lacks the dependent V2 tables/columns, and production `workout_logs.result_data` has a NOT NULL default while the test schema changed this to nullable. Keep the production-compatible NOT NULL/default semantics unless an exact frontend write-path audit proves a safe alternative.

## 3. Production-derived sequence

### WOD/exercise compatibility

- Reconcile the current production `wods`, `workout_exercises`, `exercises` and timer/prescription columns before adding any metadata.
- Preserve the existing WOD and exercise rows, IDs, names and ownership.
- Add favorite/assignment visibility only with explicit member ownership and RLS.
- Preserve private PT WOD rules: a private client WOD must not leak through public WOD lists, search, favorites, class visibility or infotainment.
- Validate sort order and structured workout schema in actual save/read round trips; do not rely only on client state.

### Atomic workout logging

- Verify `workout_logs.result_data` NOT NULL/default and all score fields.
- Add or reconcile `class_live_session_id` only after the class-session schema and membership/booking contract are approved.
- Deploy child table/foreign-key dependencies before RPCs.
- Implement atomic save under caller RLS; validate title, exercise array, names, numeric fields, set values and source WOD ownership.
- Store stable sort order exactly as submitted and prove read-back ordering.
- Preserve all workout rows and avoid partial logs if a child insert or PT linkage fails.
- Make retries idempotent where the app can retry after network loss.

### PT linkage

- Add `pt_wod_assignments` and programme session dependencies before linkage RPC.
- Verify the caller owns the assignment/programme session and the source WOD matches the assigned WOD.
- Prevent reuse of one workout log across unrelated PT tasks.
- Ensure a failed completion rolls back the workout insert as part of the same transaction.
- Handle already-completed assignments idempotently only when the same workout log is linked.

### Personal records

- Preserve the existing standalone PR with a null workout link.
- Add a trigger that validates any non-null workout link belongs to the same member.
- Validate PR units (including kg, cm, reps, seconds, meters and calories) and exercise measurement semantics; box height is centimeters, not weight.
- Compare time metrics in the lower-is-better direction and other numeric metrics in the higher-is-better direction.
- Add uniqueness/idempotency only after duplicate preflight; retain separate RX/Scaled/Foundation categories.
- Prevent PR creation for another member or an unrelated workout.

## 4. Required acceptance tests

- Existing WOD remains intact and retains its ID.
- Existing standalone PR remains unchanged and still appears in PR history.
- Member saves a workout with ordered exercises and multiple sets; reloaded history preserves exact order and values.
- Invalid workout payload rolls back all inserts.
- Retry after simulated network interruption does not duplicate the workout or its sets.
- Score payloads for AMRAP, EMOM, For Time, Tabata and station circuits round-trip without data loss.
- Members cannot attach another user's WOD or workout.
- Private PT WODs are visible only to the assigned client and authorized coach/staff.
- PT assignment/programme completion is atomic with workout logging and idempotent on retry.
- PR linked to another member's workout is rejected; a standalone PR remains supported.
- PR comparison respects unit and prescription category.
- All direct table grants and RPC grants are role-tested; anon/pending/rejected users cannot save or read protected training data.

## 5. Execution boundary

Only source review and aggregate read-only production queries were performed. No DDL/DML, function, trigger, policy, Auth, Edge Function or deployment changes were made.

**B11 result:** WOD/workout/PR migration dependencies and the standalone historical PR preservation requirement are documented. Production remains **NO-GO** pending backup/PITR evidence, isolated restore rehearsal, full schema reconciliation and owner approval.
