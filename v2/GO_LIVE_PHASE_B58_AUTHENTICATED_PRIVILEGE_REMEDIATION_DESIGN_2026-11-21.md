# GO LIVE Phase B58 – authenticated privilege remediation design
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Status:** Review-only remediation design; not executable production authorization

## 1. Confirmed scope
B57's live catalog recheck confirmed direct relation ACL entries on 12 public base tables:
`class_bookings`, `classes`, `member_preferences`, `personal_records`, `pt_bookings`, `pt_client_notes`, `pt_messages`, `pt_requests`, `pt_session_exercises`, `pt_sessions`, `social_comments`, `social_posts`.

Each relation ACL contained `authenticated=arwdDxtm/postgres`. Effective checks returned true for authenticated TRUNCATE, TRIGGER and REFERENCES. A separate `pt_session_capacity` object is a view, not a base table; its ACL is not counted as a table TRUNCATE exposure.

## 2. Proposed least-privilege outcome
For the 12 confirmed base tables:
- Retain the existing application CRUD privileges (SELECT, INSERT, UPDATE, DELETE) unless a separate table-specific review identifies a narrower requirement.
- Remove authenticated TRUNCATE, TRIGGER and REFERENCES.
- Preserve service_role and owner privileges.
- Do not change RLS policies, function EXECUTE grants, sequence privileges or Storage permissions as part of this remediation.
- Do not blanket-revoke authenticated CRUD; RLS and column grants remain separate controls.

Rationale:
- TRUNCATE is not governed by row-level security and can bypass row-level data protections.
- Client users should not need to create/drop triggers or define foreign-key constraints.
- These are schema/administrative privileges, not ordinary app actions.

## 3. Default privileges – separate decision
B57 also captured broad default ACLs for public objects:
- Objects created by `postgres`: default table ACL includes authenticated CRUD plus TRUNCATE/TRIGGER/REFERENCES.
- Objects created by `supabase_admin`: default table ACL includes anon and authenticated broad privileges.
- Function default ACLs for both owners include EXECUTE for anon and authenticated.

Do not change `supabase_admin` defaults in this release without confirming Supabase platform ownership and documented platform expectations. Treat it as a separate platform-default investigation. For `postgres` defaults, a narrowly scoped removal of TRUNCATE/TRIGGER/REFERENCES from authenticated is a candidate only after the owner confirms future migration execution role and isolated restore testing.

## 4. Mandatory preflight and postflight for a future candidate
Before any production execution:
1. Wave 0 encrypted backup and isolated restore rehearsal must be evidenced.
2. Re-query all 12 relation owners, relation kinds, exact ACLs and effective privileges.
3. Confirm the expected 12-object set exactly; stop if any object is missing, renamed, not a table, or has unexpected ACL/grantor.
4. Inspect application SQL, RPCs, Edge Functions and CI tests for legitimate dependencies on TRUNCATE, TRIGGER or REFERENCES by authenticated.
5. Test the proposed revokes on the isolated restored clone.
6. Verify admin, manager, member and anonymous CRUD/RLS behavior, class booking, PT booking/waitlist, PR and workout save flows.
7. Verify service_role and migration-owner operations remain functional.
8. Verify postflight that authenticated has no TRUNCATE/TRIGGER/REFERENCES on the 12 tables and retains only intended CRUD grants.
9. Review and approve exact SQL hash before production application.

## 5. Execution boundary
This document is a design only. No SQL remediation script was applied or added to the migration directory. No grants, default ACLs, policies, tables, functions, Auth settings, data or hosting were changed. No deployment occurred.

**B58 result:** A narrow least-privilege target is defined for review, but production remediation is blocked until backup/restore, dependency review and isolated testing pass. Production remains **NO-GO**.
