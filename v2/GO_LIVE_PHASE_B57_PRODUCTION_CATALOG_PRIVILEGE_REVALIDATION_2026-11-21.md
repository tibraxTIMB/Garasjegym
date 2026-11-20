# GO LIVE Phase B57 – production catalog privilege revalidation
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Production project:** `kultdmklwmilhoytrrig`  
**Decision:** CRITICAL AUTHENTICATED TABLE PRIVILEGE FINDING; NO PRODUCTION MUTATION

## 1. Scope and method
Read-only SQL inspection of the live production catalog after B56:
- `pg_proc` definitions, SECURITY DEFINER flags, ACLs and search_path configuration.
- `pg_class` row-level security flags for public base tables.
- `pg_policies` policy expressions and command scope.
- `information_schema.triggers` trigger inventory.
- `information_schema.role_table_grants` privilege inventory for anon, authenticated and service_role.
No data rows were exported. No SQL writes, grants, revokes, migrations, Auth changes or deployments were performed.

## 2. Confirmed production catalog facts
- 18 public base tables were returned; RLS is enabled on all 18.
- Seven public SECURITY DEFINER functions were returned. All seven have explicit `search_path = pg_catalog, public, pg_temp`.
- Exactly four of the seven have EXECUTE granted to authenticated: `book_pt_session`, `is_active_user`, `is_admin`, and `is_admin_or_manager`. The three trigger routines (`check_class_booking_capacity`, `handle_new_auth_user`, `pt_promote_waitlist_after_cancel`) do not grant authenticated execution.
- Production trigger inventory includes class booking capacity, updated-at triggers, and PT waitlist promotion.
- No anon table grants appeared in the role_table_grants aggregation.

## 3. Critical finding – authenticated TRUNCATE and TRIGGER privileges
A follow-up query using `has_table_privilege` and `pg_class.relacl` independently confirms that the `authenticated` role has:
- The initial role-grant aggregation listed 13 names, but the follow-up effective-privilege/ACL query confirms the following **12 public base tables**:
  `class_bookings`, `classes`, `member_preferences`, `personal_records`, `pt_bookings`, `pt_client_notes`, `pt_messages`, `pt_requests`, `pt_session_exercises`, `pt_sessions`, `social_comments`, `social_posts`.
- `TRIGGER` on the same 13 tables.
- `REFERENCES` on the same 13 tables.

This is a materially different risk from ordinary row-level INSERT/UPDATE/DELETE grants. PostgreSQL TRUNCATE is not filtered by row-level security; therefore RLS enabled on a table does not protect it from a role that has TRUNCATE privilege. The ACL entries on all 12 tables explicitly show `authenticated=arwdDxtm/postgres`; the grants are direct relation ACL entries with `postgres` as grantor. `has_table_privilege` returns true for TRUNCATE, TRIGGER and REFERENCES on each of the 12 tables. `pt_session_capacity` appeared in the first information_schema aggregation but did not appear as a public base table in the follow-up `pg_class` query; its relation kind and grant path remain to be identified. The provenance/default-privilege source for the direct grants still needs investigation. TRIGGER and REFERENCES are also unnecessary for normal client CRUD and should be reviewed.

**Do not execute a blanket revoke based only on this summary.** First capture exact `relacl`, `has_table_privilege` results, grantors, inherited role membership, schema default ACLs and dependency requirements. Then prepare a least-privilege remediation script and test it on an isolated restore. Production remediation remains blocked by the missing verified backup/restore evidence in Wave 0.

## 4. SECURITY DEFINER interpretation
The live function bodies show:
- `is_active_user`, `is_admin`, `is_admin_or_manager` bind checks to `auth.uid()` and active profile state.
- `book_pt_session` checks authenticated active membership, published/future session, duplicate booking, capacity and uses a row lock.
- Trigger functions are not intended for direct client invocation.
The function ACLs and grants still require the focused review already recorded in B55. No blanket helper revoke was made.

## 5. Next required actions
1. Confirm effective authenticated TRUNCATE privilege with `has_table_privilege` for all 13 tables.
2. Capture exact relation ACLs, grantors, role memberships and default ACLs.
3. Trace why the authenticated role received TRUNCATE/TRIGGER/REFERENCES, including historical migration source where available.
4. Build a narrowly scoped revoke candidate, test on isolated restore, then run admin/member/anonymous regression tests.
5. Keep production unchanged until Wave 0 backup and restore acceptance are evidenced and the remediation is independently reviewed.

## 6. Execution boundary
All inspection in this phase was SELECT-only. No production data, schema, grants, policies, triggers, functions, Auth settings, Storage objects or hosting configuration were changed. No production migration or deployment was performed.

**B57 result:** RLS is enabled on all 18 public tables, but the catalog reports authenticated TRUNCATE privileges on 13 tables. This is a critical unresolved privilege boundary and a hard NO-GO until verified and remediated safely. Wave 0 remains NOT PASSED.
