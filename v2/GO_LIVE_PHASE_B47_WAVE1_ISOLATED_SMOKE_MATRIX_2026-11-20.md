# GO LIVE Phase B47 – Wave 1 isolated Auth/RLS smoke matrix prepared

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** test design for Wave 1 restore rehearsal  
**Decision:** TEST MATRIX READY; EXECUTION BLOCKED UNTIL WAVE 0 RESTORE

## 1. Matrix created

Added `v2/supabase/preflight/wave1_membership_auth_smoke_matrix.md`.

It defines isolated test identities:
- Existing admin and two existing members using restored UUIDs.
- Disposable pending, rejected and inactive users.
- A manager test identity created/promoted only in the isolated target.

It defines expected allow/deny behavior for:
- Auth session vs app authorization.
- Own profile vs other-member profile.
- WOD/exercise, workout/PR and PT/class booking access.
- Admin/staff navigation.
- Membership approval/rejection, role changes and activation.
- Manager profile edits, self-edit denial and privilege boundaries.
- Music Edge Function membership checks.

## 2. Important separation

A pending user may be able to authenticate and read their own profile so the waiting screen can render. That does **not** mean the user is authorized for member data. The actual negative tests must use the user's JWT through PostgREST/RPC; SQL calls as postgres are not an RLS test.

The matrix also covers `book_pt_session(uuid)` row locking, published/future-session checks, duplicate booking prevention, capacity and waitlist behavior. It specifies that the music Edge Function is deployed only after the membership schema exists.

## 3. Evidence and stop conditions

The matrix requires recording only identity labels, allow/deny outcomes, HTTP/RPC status, UTC time and code hashes. No passwords, JWTs, emails, UUIDs, password hashes or service-role credentials are to be recorded.

Stop if any pending/rejected/inactive account accesses protected data, any member sees another member's private data, manager self/privilege escalation succeeds, admin loses access, signup creates an active/approved profile, or existing identity/role/active invariants change.

## 4. Execution boundary and outcome

This phase created test documentation only. No SQL was executed, no disposable user was created, no production or TEST database was modified, and no function or hosting deployment was performed.

**B47 result:** Wave 1 role/RLS smoke matrix is ready for the isolated restore. It cannot be truthfully marked passed until Wave 0 backup and restore are completed. Production remains **NO-GO**.


### Clarification: anonymous Auth identities
The smoke matrix now distinguishes an unauthenticated request with no JWT (U) from an anonymous Supabase Auth user/session (AN), if project-level anonymous sign-in is enabled. AN is a real Auth session but is not an approved membership and must be denied protected app data. The project setting remains owner-verification work in B41; include the AN test only if enabled.
