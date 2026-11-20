# GO LIVE Phase B64 – production RLS policy semantic drift and privacy findings
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Branch head before report:** `de2e5407c7c4a98e469491d17b5cade94c7cf40d`

## 1. RLS is enabled everywhere, but policy semantics are not equivalent
Read-only catalog checks confirm:
- Production: all 18 public base tables have RLS enabled; none disabled.
- TEST: all 46 public base tables have RLS enabled; none disabled.

This is a positive baseline, but RLS-enabled does not mean the policies are correct. Comparing the policy expressions for shared tables found material production-vs-TEST differences.

## 2. High-priority production privacy findings

### 2.1 Class booking read policy is broader than TEST
Production `class_bookings_read_own_or_staff` USING expression:
`(is_active_user() AND status = 'confirmed') OR (member_id = auth.uid() AND is_active_user()) OR is_admin_or_manager()`

Because the first OR branch is true for any active user when a booking is confirmed, every active member can read all confirmed class booking rows, not just their own rows or staff-visible rows.

TEST policy is restricted to:
`is_active_user() AND (member_id = auth.uid() OR is_admin_or_manager())`

**Impact:** production currently has a likely cross-member booking privacy exposure. Treat as high priority and verify with role-switched tests in an isolated clone. Do not assume UI filtering protects the data.

### 2.2 Published PT sessions are visible more broadly in production
Production `pt_sessions_read` includes:
`is_active_user() AND (is_admin_or_manager() OR client_id = auth.uid() OR status = 'published')`

This makes every published PT session visible to every active member, including sessions where `client_id` is set to another member.

TEST policy distinguishes public sessions (`client_id IS NULL`) from client-linked sessions and adds assigned-coach/own-booking conditions.

**Impact:** client-linked PT session rows may be visible across members if their status is published. Review the actual data fields and application query projections; treat as high-priority privacy risk.

### 2.3 Class booking insert/update rules are older and looser
Production insert allows own active-member bookings with status `confirmed` or `pending`, without the TEST policy's checks for published, future, non-cancelled classes and waitlist state. Production update does not have TEST's additional guard against members changing attendance markers.

This can permit stale/unpublished/cancelled class booking operations and weaker attendance integrity, subject to other constraints/triggers.

### 2.4 PT and WOD access rules differ
- Production `pt_requests_read/update` has no assigned-coach-specific predicate found in TEST.
- Production `pt_sessions_read` does not distinguish public from client-linked published sessions.
- Production WOD policy set is simpler (2 policies) than TEST (4 policies), while TEST includes scoped private WOD visibility and PT-coach-owned draft flows.

These differences must be reconciled with app roles and the intended privacy model.

## 3. Required remediation
1. Build a policy-by-policy diff for every shared table, including USING and WITH CHECK expressions, roles, command, permissive/restrictive mode and helper function semantics.
2. Create a production-shaped isolated test database with at least two members, one admin, one manager and one assigned PT coach.
3. Add negative authorization tests proving:
   - Member A cannot list Member B's confirmed class bookings.
   - Member A cannot read a PT session linked to Member B unless explicitly authorized as coach/staff.
   - Members cannot write attendance fields or book unpublished/past/cancelled classes.
   - Unassigned members cannot read private PT WODs or client-specific program/session data.
4. Review function grants and SECURITY DEFINER helper behaviour in conjunction with the policies.
5. Apply only a reviewed, tested, minimal migration after a verified restore rehearsal and explicit cutover approval.

## 4. Actions taken
- Read-only comparison of `pg_policies` expressions for shared tables.
- Read-only RLS coverage counts for production and TEST.
- No policy, grant, table, data, Auth, Edge Function or deployment changes.

**B64 result:** RLS is enabled on all public base tables in both projects, but production contains broader booking and PT-session row visibility than TEST. This is a security/privacy blocker. Production remains NO-GO.
