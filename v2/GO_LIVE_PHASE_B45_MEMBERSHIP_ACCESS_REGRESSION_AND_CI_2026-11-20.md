# GO LIVE Phase B45 – membership access regression tests and candidate isolation guard

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Commit tested:** `47463c01088039b095023594220abbba584a4029`  
**Decision:** APPLICATION TESTS GREEN; SQL CANDIDATE REMAINS UNEXECUTED

## 1. Shared membership access logic

Added `v2/src/lib/membershipAccess.js` with shared, pure functions:
- `hasApprovedActiveMembership(profile)`
- `isStaff(profile)`
- `getMembershipGate(profile)`
- `canManageMemberAccess(profile, member)`

The app, staff navigation and Admin member edit controls now use the same membership rule. This reduces the risk that one component treats a pending or unknown status differently from another.

## 2. Regression tests added

Added `v2/scripts/membership-access.test.mjs` and included it in `npm test`. The tests cover:
- Approved active member access.
- Pending, rejected, inactive, missing and unknown membership state denial/fail-closed behavior.
- Admin/manager staff classification.
- Manager cannot edit self, another manager/admin, pending, inactive or unapproved member.
- Approved admin can manage members and self-profile metadata (while existing UI action guards still block self role/active changes).

Added `v2/scripts/membership-candidate.test.mjs` and included it in `npm test`. This guards that the SQL candidate:
- Remains under `supabase/candidates`, outside the auto-applied migration directory.
- Contains the Wave 0 rehearsal tripwire and expected baseline assertions.
- Uses pending/inactive defaults and email-only conflict update.
- Contains the approved-membership helper checks and narrow UPDATE grants.
- Has balanced dollar-quote blocks and no DROP TABLE, TRUNCATE or DELETE FROM statements.

The candidate guard is a repository safety test, **not** a PostgreSQL parser or proof that the SQL has executed successfully. SQL syntax and behavior must be tested in the isolated restore rehearsal.

## 3. CI results

Both relevant workflows completed successfully on the tested commit:
- STURMKOPF build and focused test workflow: **SUCCESS** (run 44831843048).
- Full GarasjeGym 2.0 checks: **SUCCESS** (run 44831843088).

The full check includes the automated test suite, isolated TEST bundle build and release artifact environment/secrets check. These are code/build results, not production database or Auth restore results.

The preview workflow is separate and is not required for this regression test. No preview or production deployment is authorized by this phase.

## 4. Execution boundary and outcome

No SQL candidate was run. No production/TEST DDL or DML, Auth change, Edge Function deployment, secret change, hosting publication or paid resource was used.

**B45 result:** Shared membership rules and regression tests are in place; both CI verification workflows pass. Wave 0 restore and owner Auth settings remain blockers. Production remains **NO-GO**.
