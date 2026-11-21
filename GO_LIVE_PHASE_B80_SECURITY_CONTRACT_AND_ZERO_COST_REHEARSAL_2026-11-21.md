# B80 – Release security gate and zero-cost rehearsal status
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch: `garasjegym-2.0-sturm­kopf`

## Added automated security contract
Added `v2/supabase/preflight/release_security_contract_assertions.sql`. It checks eight release-critical invariants:
1. New Auth signup creates an inactive, pending profile and stores the email.
2. Active-user helper requires approved membership.
3. Admin helper requires approved membership.
4. Admin/manager helper requires approved membership.
5. Class-booking reads are scoped to the member or staff.
6. PT session reads separate public slots from client-linked appointments and assigned-coach access.
7. PT session exercise reads respect client privacy.
8. Member class reads are limited to published classes.

Executed the exact SQL read-only against both live environments:
- TEST: all 8/8 checks pass.
- Production: all 8/8 checks fail.

Integrated the assertion into the full local Supabase PG17 replay workflow so a clean replay must meet this contract before CI can pass.

## Latest CI
On commit `82f90de5f7200e3c7551b45e93d11a281c17cdfa`:
- Build and automated checks: passed.
- Disposable PostgreSQL 17 trigger-function privilege rehearsal: passed.
- Disposable PostgreSQL 17 Wave 1 membership/Auth candidate rehearsal: passed.
- Full local Supabase replay: queued behind teardown of an earlier cancelled run at time of this report. Do not label it passed until the latest run completes the migration replay, contract assertions and Auth signup test.

## Live Production security advisor
Latest read-only security advisor returned:
- Four SECURITY DEFINER functions callable by authenticated users: `book_pt_session`, `is_active_user`, `is_admin`, `is_admin_or_manager`. These are currently used by app/RLS logic; do not blindly revoke them. Review direct RPC exposure and keep only intended call paths.
- Leaked-password protection is disabled in Supabase Auth. Enable it in the project Auth security settings before inviting members, after confirming compatibility and documenting the change.

## No-cost rehearsal limitation
Production project has no existing Supabase development branches. Supabase's quoted development-branch compute cost for this organization is USD 0.01344/hour. The project is on the Free plan and the user's project constraint is zero budget. No paid branch was created and no project upgrade was initiated.

A true Production-derived restore cannot be replaced by the TEST project: TEST is not a clone of Production and has a different schema, data and project configuration. Do not claim backup/restore validation from TEST.

## Current decision
**Production remains NO-GO.** The live RLS and Auth contract fails, and no Auth-preserving backup/restore has been demonstrated. Do not deploy or mutate Production until those gates are resolved.
