# GO LIVE Phase B10 – PT Studio production migration design

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** PT STUDIO DESIGN READY FOR ISOLATED REHEARSAL; PRODUCTION NO-GO

## 1. Existing production PT data (read-only)

Exact row counts in production project `kultdmklwmilhoytrrig`:

| Existing table | Rows |
|---|---:|
| `pt_sessions` | 1 |
| `pt_bookings` | 1 |
| `pt_client_notes` | 0 |
| `pt_messages` | 0 |
| `pt_requests` | 0 |
| `pt_session_exercises` | 0 |

These are legacy production tables and must be preserved. Zero rows in some tables does not mean the table or its access contract can be removed. PT notes/messages/bookings remain sensitive member data and require strict row isolation.

The new PT Studio schema is absent from production. It includes coach registry/assignments, services/requests, intake/goals, templates/programmes/sessions and check-ins. It must be added as a production-derived additive migration sequence, not by replaying the full test history.

## 2. Migration source review and identified policy risks

Inspected:

- `20261118222052_pt_studio_2.sql`
- `20261119084342_202611190004_pt_coach_registry_and_service_requests.sql`

The migrations define ten core PT Studio tables and broad authenticated grants constrained by RLS. They are useful source material but cannot be accepted unchanged.

### Authorization issues to resolve before production rehearsal

1. Several policies grant staff access only through `is_admin_or_manager()`, while the product has a coach role through `pt_coaches` and explicit `pt_client_assignments`. A coach assigned to a client may be unable to read/update that client's intake, goals, programme or check-in. Define one reviewed helper for assigned-coach access and apply it consistently.
2. Conversely, coach access must be scoped to active assignments only; a coach must not gain access to every member's PT records.
3. `pt_client_assignments` needs an invariant preventing multiple active coaches for one member (the source migration uses a partial unique index) and must prevent self-assignment, unauthorized assignment changes and coach impersonation.
4. The `pt_coaches` staff-management policy uses `FOR ALL` and checks `created_by=auth.uid()` on writes. Confirm whether admin-managed coach records may be updated by a different authorized admin; do not accidentally lock legitimate administration out.
5. The member update policies on `pt_program_sessions` and `pt_checkins` rely on column-level grants plus RLS. Verify that a member can change only intended completion/answer fields and cannot change program linkage, coach notes, status transitions, reviewed timestamps or another member's records.
6. The PT Studio migrations use cascading deletes from member profiles for some records. This must be reconciled with legal/operational retention requirements and the planned member deletion function. Do not introduce cascade deletion of notes, check-ins or training history without explicit retention approval.
7. PT notes/messages/booking records already exist in production under legacy tables. Map the app's current screens and RPCs to those tables and preserve them; do not create duplicate replacement records or rename/drop the legacy objects.
8. Coach/client access must be consistent across all new and legacy PT objects. A single policy audit matrix is required for member, assigned coach, unassigned coach, manager, admin and anonymous roles.

## 3. Production-derived migration sequence

Create separate reviewed units:

### PT-A – coach and relationship foundation

- `pt_coaches`, `pt_client_assignments`, `pt_services`, `pt_service_requests`.
- Add checks, indexes and partial unique active-assignment invariant.
- Validate coach accounts are active/approved and role-eligible.
- Ensure service request ownership is immutable to members except allowed cancellation.
- Restrict assignment and service administration to authorized staff.
- Define coach capacity behavior and whether over-capacity assignment is rejected.

### PT-B – intake, goals and programme model

- `pt_intakes`, `pt_client_goals`, `pt_program_templates`, `pt_programs`, `pt_program_sessions`.
- Add assignment-aware RLS for assigned coaches, member-self read, and manager/admin access.
- Preserve immutable snapshots for assigned WODs/programme sessions.
- Define who may change sequence, scheduled date, coach notes, status and workout linkage.
- Prevent member edits to coach-owned content.

### PT-C – check-ins and integration

- `pt_checkins`, then `pt_wod_assignments` and any dependent notification/calendar integration only after those dependencies are separately reviewed.
- Enforce pending → submitted → reviewed transitions and timestamp ownership.
- Restrict member writes to answer payload and submission state only.
- Keep review metadata staff/coach controlled.
- Add idempotent notification hooks only after notification RLS is validated.

Each unit must include preflight row/constraint/FK checks, postflight assertions, explicit grants, fixed search paths for privileged functions, role-based tests, data-preservation checks and a tested restore/forward-fix plan.

## 4. Required acceptance matrix

| Actor | Expected PT access |
|---|---|
| Anonymous | No PT records or RPC access |
| Member | Own requests, intake, visible goals, own programme/check-ins and own PT bookings/messages only |
| Assigned coach | Only currently assigned clients' permitted PT records and assigned programme/check-in workflow |
| Unassigned coach | Public coach/service profile only; no client private records |
| Manager | Operational PT oversight as explicitly approved; no implicit access beyond the manager policy |
| Admin | Full PT administration with audited role checks |

Specific tests:

- Existing production PT session and booking remain unchanged and linked to the same profiles.
- Existing notes/messages/requests remain present and private.
- Member A cannot read or mutate Member B's PT data.
- Assigned coach can access only assigned clients; ending an assignment revokes access immediately.
- Coach cannot assign themselves or alter another coach's assignment.
- Members cannot change coach notes, programme ownership, review metadata or other clients' records.
- Program completion and check-in submissions accept only valid state transitions.
- Deletion/retention behavior is verified before any cascade is enabled.
- No new PT RPC can be called by anon or a pending/rejected member.

## 5. Execution boundary

This phase was design/source review plus read-only production counts only. No DDL/DML, policy, trigger, function, Auth or Edge Function changes were made. No deployment occurred.

**B10 result:** PT Studio migration dependencies and important coach-scope/privacy risks are documented. Legacy PT records are preserved. Production remains **NO-GO** pending backup/PITR evidence, isolated restore rehearsal, policy and app contract validation, and explicit owner authorization.
