# B69 – Schema object inventory and Wave 2 privacy rehearsal
Date: 2026-11-21
Branch: garasjegym-2.0-sturm­kopf
Production: kultdmklwmilhoytrrig
TEST: izwzwvlexqxqewzijhhd

## CI results
- Run 44837839955, commit fce1e771: build success and disposable PostgreSQL 17 Wave 1 rehearsal success.
- This validates the membership/Auth candidate against its disposable fixture only, not a full Supabase restore or full production schema.

## Extended privacy candidate
Added `v2/supabase/candidates/wave2_rls_privacy_production_candidate.sql` as review/rehearsal only.
- Class-booking SELECT is limited to own rows or admin/manager.
- PT session SELECT is limited to staff, own client-linked sessions, public unassigned published sessions, and the member's own booked private session.
- Own-booking helper is SECURITY DEFINER with pinned search_path and restricted EXECUTE grants.
- Assigned-coach visibility is intentionally not included yet: production lacks the newer coach registry/assignment tables needed to evaluate that relationship. This candidate is not a complete PT access policy and must not be deployed alone.

## Disposable fixture and assertions
Fixture contains a confirmed class booking for member B, a client-linked published PT session for member B, a public unassigned published slot, and a private draft PT session booked by member A.
Assertions check that member A cannot read member B's booking or client-linked session; can read the public slot and own booked private slot; and admin retains visibility.

## Read-only schema object inventory
| Object | Production | TEST |
|---|---:|---:|
| Public base tables | 18 | 46 |
| Constraints | 70 | 226 |
| Indexes | 38 | 181 |
| Non-internal triggers | 6 | 44 |

Counts are inventories, not a claim that every individual object has been reconciled. Full production contract still requires object-by-object review of functions/RPCs, policies, grants, views, storage and Edge Functions.

## Latest CI status
Run 44837995286 for commit 20d807a3 was still in progress at report time. No result is claimed for it.

## Release boundary
No production DDL/DML, policy/grant changes, Auth changes, Edge Function deployment, operational data deletion, merge/rebase or production deployment was performed.
