# GO LIVE Phase B32 – production catalog capture and trigger-function grant exception

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** read-only production catalog inspection; no production changes

## 1. Reproducible catalog capture prepared and validated

Added `v2/supabase/preflight/production_catalog_capture_read_only.sql`. It captures:
- Public tables and RLS flags.
- Every public column, type, nullability and default.
- Constraint and index definitions.
- RLS policies.
- Non-internal triggers.
- Public function definitions, security-definer flag and function settings.
- Public view definitions/options.
- Installed extensions.
- Table, sequence and routine grants.

The 12 individual SELECT sections were executed against production and all completed successfully. The file is SELECT-only and returns schema/security metadata, not application rows or member PII. Export the result sets from Supabase SQL Editor to a protected owner-controlled file; do not commit a live production capture to GitHub.

Fresh production catalog counts:
| Object | Count |
|---|---:|
| Public base tables | 18 |
| Public columns | 173 |
| Constraints | 70 |
| RLS policies | 49 |
| Indexes | 38 |
| Non-internal triggers | 6 |
| Public functions | 8 |
| Public views | 1 |
| Tables with RLS enabled | 18 |
| Direct anon table grant rows | 0 |

This confirms the earlier baseline counts for tables, columns, constraints, policies, indexes, functions and views. The current trigger count is 6 (the earlier B23 count was 7); the live catalog query is the current value and the older count should be treated as stale.

## 2. New grant exception found

The detailed routine-grant inventory found one public routine grant row for `anon`:
- Function: `public.set_updated_at()`
- Return type: `trigger`
- Language: PL/pgSQL
- `SECURITY DEFINER`: false
- EXECUTE: PUBLIC, anon, authenticated, postgres and service_role
- `has_function_privilege('anon', ...)`: true
- `has_function_privilege('authenticated', ...)`: true

The same ACL was observed in TEST. The other three production trigger-returning functions (`check_class_booking_capacity`, `handle_new_auth_user`, `pt_promote_waitlist_after_cancel`) have EXECUTE restricted to postgres and service_role.

`set_updated_at()` is a trigger function attached to existing update triggers; PostgreSQL trigger-returning functions cannot be invoked as ordinary scalar/RPC functions. The grant does not itself establish anonymous table access: the production catalog reports zero direct anon table grant rows and RLS is enabled on all 18 public tables. Nevertheless, PUBLIC/anon/authenticated EXECUTE is unnecessary privilege for this trigger-only function and is inconsistent with the other trigger-function ACLs.

### Proposed narrow remediation (NOT APPLIED)

After Wave 0 restore rehearsal, validate trigger behavior on the restored production copy, then consider this narrowly scoped forward-only change:

```sql
REVOKE EXECUTE ON FUNCTION public.set_updated_at()
  FROM PUBLIC, anon, authenticated;
```

Expected postflight:
- `has_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE') = false`
- `has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE') = false`
- postgres and service_role retain the intended EXECUTE access.
- Existing updated_at triggers continue to work for authorized updates on profiles, exercises, wods and workout_logs.
- No table grants or RLS policies are modified.

Do not run this remediation against production now. It belongs in the reviewed production migration package after a restore rehearsal and trigger smoke tests. Reconcile the existing production migration named `restrict_trigger_function_execution`: its intended restriction did not remove this function's PUBLIC/anon/authenticated grants.

## 3. Migration lineage search update

GitHub commit search for all eleven production migration version identifiers returned no matching commits. This does not prove that no historical source exists elsewhere, but it means the current repository's accessible commit search has not recovered it. Keep the provenance gap open; do not synthesize original source history.

## 4. Execution boundary and outcome

Executed only read-only catalog SELECTs against production and TEST. No DDL/DML, grants, RLS policies, Auth settings, Edge Functions, deployment or paid resources were changed.

**B32 result:** Reproducible catalog capture query pack is committed and production-validated. One unnecessary trigger-function EXECUTE grant exception is identified and documented with a narrow, unapplied remediation. Production remains **NO-GO** pending Wave 0 recovery, migration provenance and rehearsal.
