# GO LIVE Phase B36 – installed migration provenance and forward-only rollout map

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Decision:** SOURCE PROVENANCE GAP CONFIRMED; NO PRODUCTION MIGRATION AUTHORIZED

## 1. Fresh live-ledger and repository count reconciliation

A fresh read-only comparison returned:
- Production migration ledger: **11** installed versions.
- TEST migration ledger: **163** installed versions.
- STURMKOPF `v2/supabase/migrations`: **163** SQL files, every file version present in the TEST ledger.
- Root legacy `supabase/migrations`: **15** separate SQL files.
- Production installed versions represented by a same-version file in either repository migration directory: **0 of 11**.

All 11 production ledger entries were rechecked individually. The exact version/name pairs are listed below. The current repository does not contain their original source files. A similarly named TEST migration is not proof of original production SQL, even where its purpose appears related.

## 2. Production installed ledger – source provenance map

| Installed production version | Ledger name | Same-version source | Candidate only – not verified equivalent |
|---|---|---|---|
| `20261116213905` | `lock_down_manager_profile_updates` | Missing | No proven source candidate |
| `20261116214010` | `restrict_trigger_function_execution` | Missing | TEST trigger RPC restrictions `20261116230042` and `20261119095214`; not proven equivalent |
| `20261116214020` | `restrict_anon_security_definer_rpc` | Missing | TEST RPC grant hardening `20261116230023`; not proven equivalent |
| `20261117191749` | `workout_result_scoring_fields` | Missing | TEST score fields `20261117203914`; same general domain, version/content equivalence unproven |
| `20261117210956` | `align_workout_log_result_data` | Missing | TEST `20261117210959`; version differs and production result_data has a NOT NULL/default contract |
| `20261118184920` | `wod_timer_settings_and_exercise_metadata` | Missing | TEST timer and exercise metadata migrations are split across multiple files; no one-to-one source |
| `20261118194052` | `exercise_prescription_profiles` | Missing | TEST `20261118194828`; version differs, source not proven equivalent |
| `20261119223903` | `revoke_anon_security_definer_execute` | Missing | No verified one-to-one source file |
| `20261119224030` | `harden_production_security_definer_paths` | Missing | TEST `20261119202903`; similar intent, source and exact function set not proven |
| `20261120214242` | `secure_pt_session_capacity` | Missing | TEST `20261120110502`; similar intent, source and deployed function definitions must be reconciled |
| `20261120214355` | `revoke_anon_public_table_access` | Missing | TEST `20261120091100`; similar intent, source and default ACL behavior differ and are not proven equivalent |

This map is deliberately conservative. Candidate rows are navigation aids for human review only, not an authorization to substitute, replay or mark migrations as recovered.

## 3. Important source-to-live reconciliation findings

### 3.1 Trigger EXECUTE grant is not fully explained by a migration name

Production ledger contains `restrict_trigger_function_execution`, but the source is missing. The current TEST migration `20261119095214_restrict_trigger_function_execute.sql` revokes EXECUTE from notification trigger functions; it does not revoke EXECUTE from `public.set_updated_at()`. The current live production `set_updated_at()` remains executable by PUBLIC/anon/authenticated. Do not assume the production ledger entry covered this function. The exact original source must be recovered or the intended behavior must be addressed as a new reviewed forward migration after restore rehearsal.

### 3.2 Anon function defaults

The TEST migration `20261120091100_revoke_anon_public_table_access.sql` revokes anon from existing tables/sequences and their default privileges, but does not revoke anon EXECUTE from default function privileges. The live production `postgres` default ACL grants anon EXECUTE for future public functions. This remains a distinct release security task; it must not be described as resolved by the similarly named table-access migration.

### 3.3 Production workout result contract

Production `workout_logs.result_data` is NOT NULL with default `{}`. TEST has a different nullable contract. Do not replay the TEST `ADD COLUMN IF NOT EXISTS result_data jsonb` migration or relax the production constraint without end-to-end compatibility proof and a data preflight.

### 3.4 Membership approval migration

The current TEST reconciliation migration `20261120205122` adds `membership_status NOT NULL DEFAULT 'approved'`. B8 documented why that default is unsafe for new direct profile inserts in production. The production-specific design must use a fail-closed default `pending`, explicitly backfill only the three existing active production profiles to approved after a fresh owner-reviewed preflight, preserve UUIDs/roles/active flags, and make new signups inactive/pending. Do not apply the TEST file unchanged.

## 4. Safe next migration package sequence

This is the authorized authoring/rehearsal order, not a database execution command:

1. **Wave 0 recovery:** owner-run encrypted export, UUID-preserving Auth recovery evidence, Storage recheck/export if needed, and successful isolated restore. Still blocked.
2. **Wave 1 membership/Auth:** production-specific fail-closed migration, existing-account preservation, signup trigger, role helpers, grants and RLS.
3. **Security foundation:** correct postgres/public default function EXECUTE ACL and narrow trigger-only function grant; verify every authenticated RPC remains callable only by intended roles.
4. **Wave 2 class booking:** publication/ownership model, attendance/waitlist fields, index transition, serialized capacity, cancellation/promotion and notifications.
5. **Wave 3 PT Studio:** additive dependency-ordered PT schema and RPCs, preserving legacy PT sessions/bookings.
6. **Wave 4 WOD/workout/PR:** preserve standalone PR and NOT NULL result_data contract; validate atomic save and measurement semantics.
7. **Wave 5 optional modules:** notifications/calendar/coffee/social/HR only within the signed scope.
8. **Wave 6 account lifecycle:** deactivation-first and audited deletion function compatible with actual production references.

Every unit requires production-derived preflight, source SQL, explicit assumptions, postflight assertions, role isolation tests, data preservation checks and concurrency tests where relevant. No test ledger replay.

## 5. CI and execution boundary

The latest completed runs for commit `0bc9f66452b12958a65d4ae3e986c693c9e59794` all succeeded:
- Full GarasjeGym 2.0 checks.
- STURMKOPF build and focused tests.
- STURMKOPF preview build.

This validates code/build, not production migration compatibility or recoverability.

No database statements beyond SELECT were executed in this phase. No production or TEST DDL/DML, Auth changes, Edge Function changes, secrets changes, hosting publication or paid resources were used.

**B36 result:** All 11 production migration source gaps are explicitly enumerated; potential candidate mappings and non-equivalences are documented. Forward-only wave order is updated. Wave 0 remains blocked and production remains **NO-GO**.
