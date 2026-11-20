# B69 – Schema object inventory and Wave 2 privacy rehearsal
Date: 2026-11-21
Branch: garasjegym-2.0-sturm­kopf
Production: kultdmklwmilhoytrrig
TEST: izwzwvlexqxqewzijhhd

## CI results
- Run 44837839955, commit fce1e771: build success and disposable PostgreSQL 17 Wave 1 rehearsal success.
- The Wave 1 rehearsal successfully applied the membership/Auth candidate and authorization assertions to its disposable production-shaped fixture.
- This does not constitute a full Supabase restore or full production schema rehearsal.

## Extended privacy candidate
Added `v2/supabase/candidates/wave2_rls_privacy_production_candidate.sql` (review/rehearsal only; not an installed migration).
- Confirmed class-booking SELECT is limited to the active member's own rows or admin/manager.
- PT session SELECT is limited to staff, own client-linked sessions, public unassigned published sessions, and the member's own booked private session.
- The own-booking helper is SECURITY DEFINER with pinned search_path and restricted EXECUTE grants.
- Assigned-coach visibility is intentionally NOT added in this candidate yet: the production schema does not currently contain the newer coach registry/assignment tables needed to evaluate that relationship. Do not deploy this policy candidate as a complete PT access policy until the complete PT schema and assigned-coach access are installed and rehearsed together.

## Disposable fixture and assertions
Extended PostgreSQL 17 fixture with:
- One confirmed class booking belonging to member B.
- One published client-linked PT session belonging to member B.
- One public unassigned published PT slot.
- One private draft PT session booked by member A.

Negative and positive assertions now verify:
- Member A cannot read member B's confirmed booking.
- Member A cannot read member B's client-linked published PT session.
- Member A can read the public unassigned published PT slot.
- Member A can read their own booked private PT session.
- Admin retains visibility of all fixture booking/session rows.

## Current schema object inventory (read-only)
| Object | Production | TEST |
|---|---:|---:|
| Public base tables | 18 | 46 |
| Constraints | 70 | 226 |
| Indexes | 38 | 181 |
| Non-internal triggers | 6 | 44 |

These are inventory counts, not a claim that every individual object was reconciled. A complete production schema contract still needs object-by-object review, including functions/RPCs, policies, grants, views, storage and Edge Functions.

## Latest run at time of report
The follow-up CI run for commit 20d807a3 (run 44837995286) was still in progress at the time of this report. Its disposable PostgreSQL 17 rehearsal and build/test jobs had started; no result is claimed for this run.

## Release boundary
No production DDL/DML, policy/grant changes, Auth changes, Edge Function deployment, operational data deletion, merge/rebase or production deployment was performed.
