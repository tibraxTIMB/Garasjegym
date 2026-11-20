# GO LIVE Phase B42 – production profile RLS and grant boundary review

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** read-only production profile policy and privilege inspection  
**Decision:** EXISTING POLICY BOUNDARIES MUST BE PRESERVED DURING WAVE 1

## 1. Live profile policies

Production has two RLS policies on `public.profiles`, both for `authenticated`:
- `profile_select_own_or_staff`: SELECT only where `id = auth.uid()` or caller is admin/manager.
- `profile_update_staff`: UPDATE where caller is admin, or admin/manager updating a row whose existing and resulting role is `member`, and whose id is not the caller's own id.

The manager branch therefore does not permit a manager to update their own profile or promote a member to admin/manager through this policy. The admin branch is intentionally broader. No anon or PUBLIC policy exists.

## 2. Table privileges

Effective grants in the catalog:
- `authenticated`: SELECT and UPDATE on `public.profiles`; no INSERT or DELETE table grant.
- `service_role`: full application table privileges.
- `postgres`: owner-level privileges.
- `anon`: no table-level grant.

This aligns with profile creation through the SECURITY DEFINER Auth trigger rather than direct client INSERT. Keep this model in Wave 1 unless the release explicitly introduces a separately audited admin approval RPC.

## 3. Wave 1 migration implications

- Preserve `profile_select_own_or_staff` row boundary; staff membership approval workflows must not make all profile rows visible to all members.
- Preserve manager UPDATE restriction to other member profiles only; manager cannot edit self or admin/manager rows.
- Ensure a pending member cannot access protected application RPCs after `is_active_user()` is changed to require approved membership.
- Admin approval must be an explicit action. If it uses direct profile UPDATE, keep it admin-only and constrain allowed columns; do not broaden manager permissions.
- Keep authenticated INSERT/DELETE absent. New profile rows remain created by the Auth trigger, with inactive/pending defaults.
- If email and membership status columns are added, confirm whether table-level SELECT is appropriate under the existing row policy; do not expose additional profile rows or add a broad SELECT policy.
- Rehearse the existing manager/admin policy and grants with approved, pending and rejected accounts.

## 4. Execution boundary and outcome

Only read-only policy/grant catalog queries were run. No RLS policies, table grants, column grants, profile rows, functions, Auth settings or triggers were changed.

**B42 result:** Existing profile access is row-scoped and staff updates are role-bounded. Wave 1 must preserve these boundaries while adding approval state and fail-closed signup. Production remains **NO-GO**.
