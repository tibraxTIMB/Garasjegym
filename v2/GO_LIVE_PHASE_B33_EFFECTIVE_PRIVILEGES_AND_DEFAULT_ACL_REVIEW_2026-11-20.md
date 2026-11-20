# GO LIVE Phase B33 – effective privileges and future-function default ACL review

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** read-only production ACL/default-privilege inspection  
**Decision:** SECURITY CONFIGURATION FIX REQUIRED IN RELEASE PACKAGE; NOT APPLIED

## 1. Effective anonymous access

A fresh privilege check against production reports:
- Anonymous schema USAGE on `public`: true.
- Existing public base tables with any effective anon SELECT/INSERT/UPDATE/DELETE privilege: 0.
- Existing public sequences with any effective anon USAGE/SELECT/UPDATE privilege: 0.
- Existing public functions executable by anon: 1.
- Existing SECURITY DEFINER functions executable by anon: 0.
- All 18 existing public base tables have RLS enabled.
- All 18 existing tables and the single view are owned by `postgres`.

Schema USAGE alone does not grant table or sequence access. The single existing anon-executable function is the trigger-only `public.set_updated_at()` already documented in B32. It is not a SECURITY DEFINER routine and cannot be invoked as a normal scalar/RPC function.

## 2. Future-function default ACL finding

Production `pg_default_acl` has six entries. Relevant entries for objects created by the `postgres` owner in schema `public` include:
- Tables: default grants to postgres, authenticated and service_role; no anon.
- Sequences: default grants to postgres, authenticated and service_role; no anon.
- Functions: default EXECUTE grants to postgres, anon, authenticated and service_role.

Therefore, although the current public tables and sequences are correctly closed to anon, a future public function created by role `postgres` may inherit EXECUTE for anon unless the migration explicitly revokes it. This is an important forward-looking grant gap. The existing migration that revokes anon access from public tables/sequences does not address function default privileges.

A separate `supabase_admin` default ACL set also includes anon grants on tables, sequences and functions. Existing public tables/views/functions inspected here are owned by `postgres`, not `supabase_admin`. Do not change the platform-owned `supabase_admin` defaults without confirming which migrations/operations execute under that role and what Supabase platform behavior depends on them.

## 3. Proposed narrow remediation (NOT APPLIED)

Include this in a reviewed production security migration after Wave 0 restore rehearsal:

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon;

REVOKE EXECUTE ON FUNCTION public.set_updated_at()
  FROM PUBLIC, anon, authenticated;
```

This intentionally leaves the authenticated/service_role function grants for application RPCs unchanged. It also leaves table/sequence ACLs unchanged. The second statement removes only the unnecessary execute privilege on the trigger-only function. Existing triggers must be tested on the restored production copy before release.

Postflight checks:
- `has_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE') = false`
- `has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE') = false`
- `has_function_privilege('service_role', 'public.set_updated_at()', 'EXECUTE') = true`
- `pg_default_acl` for postgres/public function defaults contains no anon EXECUTE.
- Newly created test function under the same migration owner does not become anon-executable.
- Existing updated_at triggers still execute for authorized updates.
- Effective anon table/sequence privileges remain zero and all 18 production tables retain RLS.

Do not use a blanket revoke across all current public functions: member-facing authenticated RPCs intentionally require EXECUTE and must remain on the reviewed allowlist.

## 4. Execution boundary and outcome

Only SELECT queries were executed against production. No ACL, default privilege, schema usage, table, sequence, function, policy, Auth setting, Edge Function, deployment or paid resource was changed.

**B33 result:** Existing anon table and sequence access remains zero, but postgres-owned future public functions inherit anon EXECUTE by default. A narrow default-privilege correction and trigger-function revoke are prepared for the reviewed production package. Production remains **NO-GO**.
