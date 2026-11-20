# GO LIVE Phase B31 – fresh production data-preservation checkpoint

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Source:** read-only aggregate SQL against production `kultdmklwmilhoytrrig`  
**Decision:** BASELINE STABLE; NO BACKUP OR RESTORE EVIDENCE

## 1. Fresh aggregate-only result

| Object / invariant | Count |
|---|---:|
| Profiles | 3 |
| Admin profiles | 1 |
| Member profiles | 2 |
| Active profiles | 3 |
| Classes | 1 |
| Class bookings | 1 |
| Legacy PT sessions | 1 |
| PT bookings | 1 |
| PT requests | 0 |
| PT messages | 0 |
| PT client notes | 0 |
| WODs | 1 |
| Workout logs | 0 |
| Workout exercises | 0 |
| Workout sets | 0 |
| Personal records | 1 |
| Standalone personal records (`workout_log_id IS NULL`) | 1 |
| Auth users | 3 |
| Auth identities | 3 |
| Auth sessions | 12 |
| Storage buckets | 0 |
| Storage objects | 0 |

The baseline is consistent with the B23 capture. No user names, email addresses, profile UUIDs, workout content or credentials were selected.

## 2. Preservation invariants for later restore

- Preserve all 3 existing Auth user UUIDs and their 3 identity relationships.
- Preserve all 3 profile rows and their current role/active values; do not auto-promote any account.
- Preserve the existing class and its booking.
- Preserve the legacy PT session and booking.
- Preserve the single WOD.
- Preserve the standalone PR exactly as standalone; do not fabricate a workout log or attach the PR to one.
- Keep workout history tables at zero unless the source snapshot later proves otherwise; do not seed demo workouts.
- Recheck Storage immediately before backup; current aggregate is still zero buckets and zero objects.
- Sessions are ephemeral and must not be treated as durable identity backup; plan for re-authentication after recovery.

## 3. Interpretation

This is a fresh data-preservation checkpoint only. Matching aggregate counts do not prove that individual rows, constraints, Auth credentials, identity provider state, secrets, Storage files or application behavior can be restored. It is not a backup, a restore rehearsal, or authorization to migrate.

## 4. Execution boundary and outcome

Only a SELECT statement with aggregate counts was executed against production. No row-level data was retrieved or changed. No DDL/DML, Auth configuration, Storage operation, Edge Function change, deployment or paid resource was used.

**B31 result:** Core aggregate counts remain stable against the previously recorded baseline, including the critical standalone PR and Auth identity counts. Wave 0 remains NOT PASSED because a supported complete backup and isolated restore have not been demonstrated. Production remains **NO-GO**.
