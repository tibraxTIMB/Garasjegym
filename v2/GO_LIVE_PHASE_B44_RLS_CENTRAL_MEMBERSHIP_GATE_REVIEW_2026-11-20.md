# GO LIVE Phase B44 – centralized RLS membership gate coverage

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** production policy and public-function authorization dependency review  
**Decision:** CENTRAL HELPER UPDATE COVERS CURRENT RLS POLICY SET; REHEARSAL STILL REQUIRED

## 1. Production policy dependency inventory

Fresh read-only query of all 49 public RLS policies returned:
- 38 policies reference `public.is_active_user()`.
- 39 policies reference `public.is_admin_or_manager()`.
- 3 policies reference `public.is_admin()`.
- 0 policies contain a direct profile-table reference.
- 0 policies directly inspect `membership_status` (column does not yet exist).

The counts overlap because many policies combine two or more helper functions. The complete policy inspection shows that the application data access rules are centrally dependent on the three authorization helpers.

This is useful for Wave 1: updating `is_active_user()`, `is_admin()` and `is_admin_or_manager()` to require both `active=true` and `membership_status='approved'` will gate the existing policy set without rewriting all 49 policies individually. This does not replace functional role-isolation tests.

## 2. Public function dependency review

All 8 current public functions were inspected:
- `book_pt_session(uuid)` explicitly checks `auth.uid()` and `is_active_user()` before booking; therefore it inherits the new approved-membership gate.
- `is_active_user()`, `is_admin()`, `is_admin_or_manager()` are the central role helpers to update.
- `handle_new_auth_user()` is the signup trigger and must create inactive/pending profiles.
- `check_class_booking_capacity()`, `pt_promote_waitlist_after_cancel()`, and `set_updated_at()` are trigger functions, not ordinary client RPC entry points. Their ACLs and trigger behavior must remain unchanged in Wave 1.
- All current SECURITY DEFINER functions inspected have fixed search_path `pg_catalog, public, pg_temp`, except the SECURITY INVOKER trigger function `set_updated_at()` whose current path is `public`. No function source or grant was changed.

The existing `book_pt_session` behavior should be retested for pending, rejected, inactive, approved member, manager and admin callers after restore. No blanket revocation or security-definer mode changes are proposed.

## 3. Consequence for release architecture

Wave 1 can keep the existing 49 RLS policies intact if:
1. The three helpers are updated correctly.
2. Their existing authenticated EXECUTE grants are preserved and anon remains unable to execute them.
3. Signup trigger creates member + inactive + pending.
4. Profile UPDATE grants and policy preserve admin approval while preventing manager self-edit/self-approval and privilege escalation.
5. Any RPC not covered by these helpers is separately reviewed.

The production-specific Wave 1 candidate already updates these helpers and preserves the policies except the narrowly updated `profile_update_staff` policy. The candidate remains outside the migration directory and has not been executed.

## 4. Execution boundary and outcome

Only read-only catalog/function queries were executed. No RLS policies, functions, grants, data, Auth configuration, Edge Functions or hosting were changed.

**B44 result:** Current RLS coverage is centrally gated by the three helpers; no direct profile-table membership bypass was found in the 49 policy predicates. Candidate helper updates are architecturally consistent with the live policy set. Isolated role/RPC tests remain mandatory. Production remains **NO-GO**.
