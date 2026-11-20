# GO LIVE Phase B49 – Wave 1 candidate PostgreSQL 17 integration rehearsal

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** disposable PostgreSQL 17 execution of production-specific Wave 1 candidate  
**Decision:** SQL CANDIDATE PASSED MOCKED POSTGRESQL REHEARSAL; SUPABASE RESTORE STILL REQUIRED

## 1. Rehearsal environment

Added a disposable PostgreSQL 17.12 service to the STURMKOPF CI workflow, using only a temporary GitHub Actions service container. It is not the production project and not the existing Supabase TEST project.

The fixture creates:
- Minimal `auth.users` table and `auth.uid()` test helper.
- Three existing Auth users and three profiles matching the B40 baseline (one admin, two active members).
- Production-shaped `on_auth_user_created` trigger and SECURITY DEFINER helpers with the fixed search_path.
- Profile RLS policies and current authenticated table grants.
- An isolated database that is destroyed when the workflow ends.

The runner sets the Wave 0 tripwire only inside this disposable service, then executes the exact candidate SQL and the assertion pack.

## 2. Candidate execution result

**Result: PASS** The exact candidate file `v2/supabase/candidates/wave1_membership_auth_production_candidate.sql` executed successfully on PostgreSQL 17.12.

Assertions passed:
- Three existing profiles remain present, active and role-preserved; existing active accounts become approved.
- New Auth signup trigger creates member + inactive + pending profile.
- A pending user can read only their own profile for the waiting screen and has no active/admin/staff authorization.
- Admin retains access and can promote a member to manager and approve a pending member.
- Manager can edit another active approved member's display name.
- Manager cannot edit self, promote a member, deactivate a member, change membership status or change email.
- Approved member can read only their own profile and is not staff.
- Rejected and inactive-approved users have no active/staff authorization.
- Authenticated has intended display-name UPDATE but no email UPDATE.
- Anon has no profile SELECT and cannot execute the membership helper functions.
- A direct profile insert omitting active/status defaults to inactive + pending.

The run log contains the explicit marker `WAVE1_POSTGRES17_CANDIDATE_TESTS_PASSED`; no SQL errors were returned.

## 3. CI evidence

- Standalone disposable PostgreSQL 17 sandbox run **44832677598**: SUCCESS (commit `1151aed53e11a0a5a0afd6f630b382b8f29a3804`).
- Integrated sandbox job in full GarasjeGym 2.0 checks **44832696323**: SUCCESS; both the Postgres rehearsal job and app build job completed successfully (commit `5fe7b3a35e54f37ccf461e3e213c29faef743ba6`).
- STURMKOPF build and tests **44832696165**: SUCCESS on the same commit.
- STURMKOPF focused build/test **44832713717**: SUCCESS on the following branch cleanup commit.
- Preview artifact build succeeded on the earlier run, but its deploy job was skipped. No preview or production publication occurred.

## 4. What this does and does not prove

This validates PostgreSQL syntax and the intended core DDL/RLS/role behavior against a production-shaped mock on PostgreSQL 17.12. It is a meaningful candidate rehearsal, but it is **not**:
- A restore of the actual production catalog/data.
- A Supabase-managed Auth service migration.
- A test of real Supabase JWT claims, Auth service trigger behavior, PostgREST grants/cache, managed schemas or Edge Function deployment.
- Proof that the three production UUIDs/roles will remain unchanged in the actual restore.

The exact same candidate must still be run against a verified isolated restore of production. Then execute the full Wave 1 smoke matrix through actual Supabase Auth sessions/JWTs and PostgREST/RPC.

## 5. Execution boundary and outcome

Only a disposable GitHub Actions PostgreSQL 17 container was modified. Production and Supabase TEST were not touched. No production/TEST DDL/DML, Auth data export, Edge Function deployment, secrets change, hosting publication or paid Supabase resource was used.

**B49 result:** The Wave 1 SQL candidate passes the PostgreSQL 17.12 fixture and role/RLS assertions. This reduces SQL syntax and basic authorization uncertainty, but does not pass Wave 0. Production remains **NO-GO** pending encrypted backup, supported Auth recovery and actual isolated Supabase restore.
