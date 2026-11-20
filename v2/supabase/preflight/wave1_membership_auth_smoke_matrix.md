# STURMKOPF FEUER 1.1 – Wave 1 Membership/Auth isolated smoke matrix

**Use only against a verified isolated restore. Never use production for these tests.**

## Test identities

Prepare disposable identities in the isolated target only:
- A: existing admin, same UUID as production restore.
- M: existing member 1, same UUID.
- N: existing member 2, same UUID.
- P: newly created signup, expected inactive + pending.
- R: rejected test identity.
- X: inactive-but-approved test identity.
- G: manager test identity (promote only in isolated target).

Do not create these users in production. Remove test identities only from the disposable target after evidence is captured.

## Expected authorization matrix

| Capability | Anonymous | Pending P | Rejected R | Inactive X | Approved member M/N | Manager G | Admin A |
|---|---|---|---|---|---|---|---|
| Auth session can exist | No | Yes, if signup/login configured | Yes, if login allowed | Yes | Yes | Yes | Yes |
| App full access | No | No | No | No | Yes | Yes | Yes |
| Read own profile | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Read another member's profile | No | No | No | No | No | Yes, per staff policy | Yes |
| Read published WOD/exercises | No | No | No | No | Yes | Yes | Yes |
| Read own workout/PR history | No | No | No | No | Yes | Yes, per staff policy | Yes |
| Book own PT session via RPC | No | No | No | No | Yes, if published/future/capacity permits | Yes, if eligible | Yes, if eligible |
| Create class booking | No | No | No | No | Yes, subject to class rules | Yes | Yes |
| Use admin/staff navigation | No | No | No | No | No | Yes | Yes |
| Approve/reject membership | No | No | No | No | No | No | Yes |
| Change another user's role | No | No | No | No | No | No | Yes, not self |
| Change another user's active state | No | No | No | No | No | No | Yes, not self |
| Manager edits another approved member display name | No | No | No | No | No | Yes | Yes |
| Manager edits own profile | No | No | No | No | n/a | No | Admin self metadata only |
| Music Edge Function | No | No | No | No | Yes | Yes | Yes |

**Notes**
- A pending or rejected user may have a valid Auth session; that is not app authorization. The app and database must deny protected data access.
- A member can read their own profile row while pending so the waiting/denied screen can render; they cannot read other profiles.
- Manager profile read access follows the current staff SELECT policy, but UPDATE must be restricted to other active, approved member rows. Manager must not approve, reject, deactivate, promote or self-edit.
- Admin may approve a pending member by setting both `membership_status='approved'` and `active=true`; rejection sets `rejected` and inactive.
- `book_pt_session` is a SECURITY DEFINER RPC but must still call `is_active_user()` and preserve its row lock, future-session, duplicate-booking and capacity/waitlist checks.
- Music Edge Function deployment must occur after the schema exists; before that, selecting `membership_status` would fail.

## Required execution sequence

1. Run the read-only Wave 1 preflight against the isolated restore and compare its source snapshot.
2. Apply the candidate only in the isolated restore after Wave 0 owner sign-off.
3. Run all positive and negative tests above with separate Auth sessions and JWTs.
4. Verify RLS through the actual PostgREST API, not only by calling SQL helpers as postgres.
5. Test role helper RPCs and `book_pt_session` with anon, pending, rejected, inactive, member, manager and admin JWTs.
6. Verify manager attempts to update own row, role, active, membership status and email are rejected.
7. Verify admin approval and rejection work; confirm the approved account can then access member features.
8. Verify the Auth signup trigger creates exactly one member profile with active=false and pending; conflict update may synchronize email only.
9. Verify all three existing production UUIDs, roles and active flags are unchanged; profile/Auth relationships remain 3/3.
10. Re-run advisors, grants, policy inventory and the restore acceptance query pack.

## Evidence to record

Record only test identity labels (A/M/N/P/R/X/G), expected/actual allow/deny, HTTP/RPC status, UTC time, schema commit/hash and any error code. Do not record passwords, JWTs, emails, UUIDs, password hashes or service-role credentials.

**Stop conditions:** any pending/rejected/inactive account can access protected data; any member can read another member's private data; manager can self-edit or change role/approval/active state; admin loses access; signup creates an active or approved profile; existing UUID/role/active state changes; trigger/RPC behavior differs; or any test depends on production data.
