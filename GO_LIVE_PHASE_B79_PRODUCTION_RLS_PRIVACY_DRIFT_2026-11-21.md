# B79 – Production RLS policy drift and privacy review
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Production project: `kultdmklwmilhoytrrig`
TEST project: `izwzwvlexqxqewzijhhd`

## Scope
Read-only comparison of `pg_policies` in the live Production and TEST databases. Compared table, policy name, command, roles, USING and WITH CHECK expressions. No policies were altered.

## Inventory
- Production: 49 public RLS policies.
- TEST: 144 public RLS policies.
- TEST-only policy identities: 104.
- Production-only policy identities: 9.
- Same table/name/command but different policy expressions: 23.

Counts are not a direct quality score; the important differences are the authorization semantics below.

## Critical privacy / authorization differences

### 1. Class booking read exposes other members' confirmed bookings
Production `class_bookings_read_own_or_staff` permits an active member to read any row with `status = 'confirmed'`, even when it belongs to another member. TEST restricts reads to the current member or admin/manager.

**Impact:** Member-to-member booking visibility is broader in Production than in the tested policy model.

### 2. Published PT sessions with a linked client are visible to all active members
Production `pt_sessions_read` allows any active member to read every row with `status = 'published'`, even when `client_id IS NOT NULL`. TEST only exposes public published slots with `client_id IS NULL`, the member's own client-linked session, assigned coach access, and the member's own public-slot booking.

**Impact:** Client-linked PT appointment metadata can be exposed to members who are not the client or assigned coach.

### 3. Published PT session exercises inherit the broad session exposure
Production `pt_session_exercises_read` permits read access where the parent session is published, without requiring the session to be public/unassigned. TEST's combined policy adds the more restrictive client/coach boundary.

**Impact:** Exercise prescriptions linked to private client appointments may be visible to unrelated active members.

### 4. Class visibility includes unpublished classes
Production `classes_read_members` allows all active members to read class rows. TEST limits member reads to published classes (staff retains management access).

**Impact:** Draft/unpublished class information can be exposed before publication.

### 5. Member profile access omits assigned PT coach visibility
Production `profile_select_own_or_staff` allows own profile or staff. TEST also permits the specifically assigned PT coach via a narrowly scoped helper. This is a functional access gap rather than a direct data exposure, but PT coach workflows rely on it.

### 6. PT coach access rules are not aligned
Production PT requests, bookings, messages, session notes and PT session access policies generally permit member plus admin/manager only. TEST introduces assigned-coach-scoped access through `app_private.is_pt_coach_for_member`. This is part of the intended PT Studio workflow and cannot be enabled by adding broad staff permissions.

## Other material policy differences
- Class booking INSERT in Production allows only confirmed/pending statuses and does not enforce that the class is published, not cancelled and in the future. TEST enforces class availability and supports waitlist.
- Class booking UPDATE in TEST additionally protects attendance fields and restricts member cancellation to valid future published bookings.
- Member preferences in Production permit owner insert/update without the active-member guard used in TEST.
- Production's existing exercise and WOD policies are functionally split differently from TEST; avoid applying policies by name without reviewing the whole table's permissive-policy OR behaviour.

## Release decision
**NO-GO.** Production RLS is not equivalent to the tested app security contract. The class-booking read and PT-session visibility findings are privacy blockers.

## Safety
This audit executed catalog-only SELECT queries. No DDL/DML, Auth, user data, policies, grants, Edge Functions, or deployment changes were made.

## Required remediation
1. Rehearse the TEST policy contract against a full restored copy of Production.
2. Test member A vs member B isolation for confirmed class bookings, public vs client-linked PT sessions, session exercises, PT messages/notes, PT bookings, assigned coach access, admin/manager access, and draft classes.
3. Apply one reviewed, forward-only policy migration after the restore and backup gates. Review permissive-policy OR combinations and table grants, not just policy names.
