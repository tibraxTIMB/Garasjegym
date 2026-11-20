# GO LIVE Phase B9 – class booking and waitlist migration design

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** CLASS BOOKING DESIGN READY FOR ISOLATED REHEARSAL; PRODUCTION NO-GO

## 1. Fresh production inventory (read-only)

Production project `kultdmklwmilhoytrrig` was inspected using aggregate and catalog-only queries:

| Check | Result |
|---|---:|
| Classes | 1 |
| Class bookings | 1 |
| Existing booking status | 1 confirmed |
| Duplicate active (confirmed/pending) member/class pairs | 0 |
| Current `class_bookings` columns | 6 |
| Current `classes` columns | 15 |

Current production `class_bookings` columns are `id`, `class_id`, `member_id`, `status`, `created_at`, `updated_at`. It has no attendance fields. Current production `classes` includes title/type/capacity/starts_at/duration/description/workout_text/wod_ids/created_by/timestamps, but does not include the test schema's `published` or `instructor_id` columns. The app dependency audit also found test-only class-live-session and WOD-completion tables.

The existing production unique index is:

```sql
CREATE UNIQUE INDEX class_bookings_one_active
ON public.class_bookings (class_id, member_id)
WHERE status IN ('confirmed', 'pending');
```

No duplicate active pairs were found in the current one-row booking set. This small snapshot does not eliminate the need for a fresh preflight during rehearsal or a maintenance window.

## 2. Test migration review – production adaptation required

Two relevant test migrations were inspected:

- `20261116230002_lock_class_capacity.sql`
- `20261119120415_class_group_waitlist_attendance.sql`

They introduce row-locking capacity checks, a duplicate preflight, waitlist status, attendance fields, a wider unique-index predicate, `book_class(uuid)`, and waitlist promotion after cancellation.

They must **not** be copied unchanged into production:

1. The test `book_class` expects `classes.published`, which does not exist in production. Production needs an explicit publication model or a reviewed alternative using existing fields; do not invent a default that silently exposes all classes.
2. Test code and frontend use `classes.instructor_id`, absent in production. It must be mapped to the intended production owner/coach relationship before adding it.
3. Test migration adds attendance fields and references the profiles table. Additive only after the responsible role, FK delete behavior and attendance visibility policies are agreed and rehearsed.
4. Test migration creates/drops an index named `class_bookings_one_active_per_member`; production has a differently named index `class_bookings_one_active`. A blind migration can leave redundant indexes or drop a production-specific safeguard. Preserve the existing index until the replacement is proven; remove it only in a separate reviewed step if genuinely redundant.
5. Capacity logic must count exactly the capacity-consuming statuses. Waitlist entries must not consume a place; duplicate protection must include waitlist; cancelled/declined entries must not block a new booking.
6. Trigger execution must be serialized per class. The final design must have a single clear capacity guard and must be concurrency-tested, including cancellation/promotion races.
7. Waitlist promotion must use a deterministic queue order and must not promote a user after the class has started, been unpublished/cancelled, or had capacity reduced below current confirmed count.
8. The test migration's trigger function and RPC grants/search_path must be checked against production's existing grants and security hardening before replacement.

## 3. Production-derived migration design

Build a new release-specific forward-only unit, separate from the test migration history.

### Preflight (must abort safely)

- Verify exact production table columns, constraints, indexes, policies, functions and trigger definitions.
- Check for duplicate confirmed/pending pairs and duplicate pairs including waitlist if already introduced.
- Check for orphan bookings and invalid statuses.
- Check capacity is positive and existing confirmed/pending counts do not exceed capacity.
- Check class publication/ownership mapping and identify every current class row.
- Check current booking policies and grants for member isolation and staff attendance permissions.
- Record row counts and status counts; do not export member identities into build logs.

### Schema/logic sequencing

1. Define and approve the publication and instructor/coach ownership model for `classes` before writing RPCs that rely on those fields.
2. Add attendance fields only with explicit allowed values, actor FK, timestamp semantics and RLS.
3. Extend status constraint to include `waitlist` only after validating every existing status.
4. Preserve the current production unique index while creating and validating a replacement index that includes waitlist. Use a safe transition and remove the old index only after the new invariant is active and tested.
5. Implement a single row-locking capacity primitive. Lock the class row before counting active seats. Count confirmed/pending only; enforce waitlist as a separate queue.
6. Implement member booking RPC with authentication, active/approved membership, published/future class validation, duplicate detection and atomic status assignment.
7. Implement cancellation and deterministic waitlist promotion with lock ordering documented and race-tested.
8. Implement staff attendance marking with admin/manager/instructor authorization, immutable actor/time audit fields, and member-safe visibility.
9. Add notification writes only after notification table/RLS and idempotency semantics are established.

### Required acceptance tests

- Existing confirmed booking remains unchanged and visible only to the correct member/staff roles.
- Member can book a future published class when capacity remains.
- At capacity, next member enters waitlist and does not overbook.
- Duplicate booking is rejected for confirmed, pending and waitlist states.
- Cancellation promotes exactly the first eligible waitlisted member once.
- Concurrent requests for the final seat never exceed capacity.
- Concurrent cancellation/promotion operations do not double-promote or deadlock.
- Unpublished, started, cancelled or invalid classes reject booking.
- Member cannot mark attendance or inspect another member's private booking data.
- Only authorized staff can mark present/absent/excused; audit actor/time are set.
- Lowering capacity below current bookings is rejected or requires an explicit reviewed workflow.
- Existing row counts and IDs remain unchanged; no production-only index/policy is silently removed.

## 4. Rehearsal and release boundary

The complete migration must first run on a fresh isolated restore of production, then pass SQL assertions, app integration tests, role-isolation tests and concurrency tests. A test database is not an adequate substitute for a fresh production restore.

No SQL was applied to production or test. No index, constraint, policy, function or trigger was changed. No application or Pages deployment occurred.

**B9 result:** Current production class/booking state is small and has no duplicate active pairs, but the schema contract differs materially from test. A production-derived migration design is documented; release remains **NO-GO** until backup/PITR evidence, isolated restore rehearsal, full schema reconciliation and explicit owner approval.
