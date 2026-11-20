# GO LIVE Phase B34 – RLS policy audience and PT capacity view verification

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** read-only production RLS/view checks

## 1. Policy audience inventory

Fresh production catalog checks report:
- 49 public RLS policies total.
- All 49 policies target `authenticated`.
- 0 policies target `anon`.
- 0 policies target `PUBLIC`.
- 49 permissive policies and 0 restrictive policies.
- All 18 public base tables have RLS enabled; none has FORCE ROW LEVEL SECURITY.

A table-by-table policy count shows expected operation-specific policy groups on classes, class bookings, profiles, PT, WOD, workout logs, personal records, member preferences and social content. Multiple policies per table are not by themselves an issue: permissive policies are OR-combined for the same command/role. The three tables flagged in earlier advisor output for overlapping permissive policies (exercises, pt_session_exercises and wods) remain an optimization/review item, not an automatic reason to merge policies without equivalent-semantics tests.

No policy changes were made. FORCE RLS was not enabled because table ownership and migration execution semantics require separate review; service_role and table-owner behavior must remain understood.

## 2. PT capacity view access verification

The live `public.pt_session_capacity` view has `security_invoker=true`. Effective privileges:
- anon: no private schema USAGE, no helper EXECUTE, no view SELECT.
- authenticated: private schema USAGE, helper EXECUTE and view SELECT.
- The view definition exposes only session_id, booked_count and waitlist_count through `private.pt_session_capacity_counts()`.

This confirms the previously applied production PT capacity hardening remains effective. It does not expose individual booking rows to anon.

## 3. Interpretation

The current RLS policy audience and PT aggregate view boundary are consistent with the intended member/staff application model. This is a catalog-level verification, not a complete behavioral isolation test. Member-versus-member and member-versus-coach access tests still must run against a fresh production restore before migration/release approval.

## 4. Execution boundary and outcome

Only SELECT catalog and privilege checks were executed against production. No policies, grants, view definitions, table settings, data, Auth configuration, Edge Functions or hosting were changed.

**B34 result:** Policy audience and PT capacity view access verified. No new anonymous policy exposure found. Production remains **NO-GO** pending Wave 0 backup/restore and end-to-end role isolation tests.
