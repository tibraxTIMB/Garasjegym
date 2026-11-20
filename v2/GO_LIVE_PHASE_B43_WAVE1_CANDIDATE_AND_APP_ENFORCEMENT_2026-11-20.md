# GO LIVE Phase B43 – Wave 1 production candidate and application enforcement alignment

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** production-derived Wave 1 candidate authoring and branch-only app/Edge Function alignment  
**Decision:** CANDIDATE READY FOR REVIEW / ISOLATED REHEARSAL; NO DATABASE OR DEPLOYMENT CHANGE

## 1. Fresh production preflight refinement

An additional SELECT-only production check confirmed:
- Auth users with missing/blank email: 0.
- Profile rows with NULL active: 0.
- Profiles with NULL/unexpected role: 0.
- Active role distribution remains 1 admin, 0 managers, 2 members.
- Auth users non-internal trigger count: 1.
- `profiles.member_rank` is absent in production.

The existing baseline remains 3 active profiles and 3 Auth users with no orphans. No user IDs, email values or other PII were selected.

## 2. Production-specific Wave 1 SQL candidate created

Added:
`v2/supabase/candidates/wave1_membership_auth_production_candidate.sql`

It is deliberately **outside** `v2/supabase/migrations`, so normal migration discovery / db push cannot treat it as an installed migration.

Candidate design:
1. Refuses to proceed unless an isolated rehearsal session explicitly sets the Wave 0 verification tripwire.
2. Asserts the exact B40 baseline (3 profiles, all active; 1 admin, 2 members; 3 Auth users; no orphan rows, missing emails or duplicate emails; one Auth trigger).
3. Refuses to run if email/membership columns already exist or the expected profile RLS policy baseline differs.
4. Adds email and membership status with fail-closed `pending` default.
5. Changes the future `active` default to false.
6. Backfills the existing three active profiles to approved without changing UUID, role or active state.
7. Replaces signup trigger so new users are member + inactive + pending; conflict path synchronizes email only.
8. Updates `is_active_user`, `is_admin`, `is_admin_or_manager` to require active and approved membership.
9. Preserves own-or-staff SELECT and limits manager profile updates to other active, approved member profiles.
10. Revokes broad table-level UPDATE and grants only `display_name`, `role`, `active`, `membership_status` column updates to authenticated; RLS then limits which actor can change which row/values.

The final privilege narrowing is stricter than the current TEST migration and must be verified against every production client write path in the isolated rehearsal. It intentionally does not grant UPDATE on email. Admin approval and role/active changes continue through the admin policy branch; managers cannot self-edit, self-approve, promote or deactivate members.

This candidate is a reviewed draft, not an executable production authorization. It has not been run against production or TEST.

## 3. Application and Edge Function alignment on the STURMKOPF branch

The app was still relying on the membership column in its profile query, but some local gates did not fail closed consistently. The following branch-only changes are now committed:

- `v2/src/lib/auth.js`: `isStaff()` now requires active **and** approved membership.
- `v2/src/App.jsx`: any membership state other than approved/rejected is routed to the waiting screen. A missing/unknown status no longer falls through to member navigation.
- `v2/src/components/Admin.jsx`: managers can no longer be offered edit controls for their own profile; they may manage only other active, approved member profiles.
- `v2/supabase/functions/garasjegym-music/index.ts`: now selects and requires `membership_status='approved'` as well as active. This is branch source only; deploying before the database migration would break the function, so it must be deployed after Wave 1 and smoke-tested.
- `v2/supabase/functions/admin-delete-user/index.ts`: the caller must be an active, approved admin. This function is not deployed in production and must not be promoted until its separate account-lifecycle review is complete.

No new public signup UI is present in the inspected V2 AuthScreen (login, password reset and password update only); project-level Supabase Auth signup configuration remains owner-verification work. The database fail-closed defaults remain required even if the app has no signup form.

## 4. Newly identified adjacent schema gap

The V2 PT Studio source writes `profiles.member_rank`, but the live production `profiles` table does not currently contain this column. It is not included in Wave 1 because it is a PT/feature-schema dependency, not a membership authorization field. Add and validate it in the relevant PT wave before enabling that UI path against production. Do not hide this mismatch by adding unrelated columns to Wave 1.

## 5. Rehearsal matrix required before approval

- Existing admin: login, retains admin, can approve/reject pending accounts and change roles for other users.
- Existing members: preserve identity, login, normal member features.
- New signup: Auth user triggers profile creation as member/inactive/pending.
- Pending, rejected, inactive and NULL/unknown membership: cannot enter protected app or call protected RPCs.
- Manager: cannot change own profile, approve/reject, deactivate, or promote another member.
- Admin: can approve and activate pending user; rejected account remains denied.
- Authenticated column grants: profile name edit and intended admin fields work; forbidden columns fail.
- RLS: own profile read; no cross-member private data; admin/manager boundaries.
- Music function: pending/rejected users denied; approved active member permitted; staff flag only for approved active admin/manager.
- Existing Auth trigger, function grants, fixed search_path and Auth UUID/profile relationships remain intact.
- Restore and app smoke tests pass before any production authorization.

## 6. Execution boundary and outcome

Only read-only SELECT checks were run against production. The SQL candidate was committed outside the migrations directory; no DDL/DML was executed. Application and Edge Function changes exist only on the STURMKOPF branch. No Edge Function deployment, Auth settings change, secret change, production/TEST schema change, hosting publication or paid resource was used.

**B43 result:** Wave 1 candidate and fail-closed application guards are prepared for review and CI. Production and TEST remain unchanged. Wave 0 backup/restore and owner Auth settings verification remain hard gates. Production remains **NO-GO**.
