# GO LIVE Phase B8 – post-gate CI and Membership/Auth migration design

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Branch:** `garasjegym-2.0-sturm­kopf`  
**Decision:** MEMBERSHIP/AUTH DESIGN READY FOR ISOLATED REHEARSAL; PRODUCTION NO-GO

## 1. Latest CI after B7 evidence commit

All three workflow runs were inspected on commit `f5be8f17d7d3e4601b3ebc7b145fcbc0ac750d4c`:

| Workflow | Run | Result |
|---|---:|---|
| GarasjeGym 2.0 checks | 44825826208 | SUCCESS |
| STURMKOPF build and test | 44825826161 | SUCCESS |
| STURMKOPF Pages preview build/deploy | 44825826198 | CANCELLED |

The two verification workflows completed successfully. The preview build was cancelled and its deploy job was cancelled. No preview or production deployment occurred. The two successful runs validate the current source on the B7 evidence commit; they do not validate production database compatibility.

## 2. Fresh production membership inventory (read-only)

A fresh aggregate-only SQL inspection of production project `kultdmklwmilhoytrrig` returned:

| Check | Result |
|---|---:|
| Existing profiles | 3 |
| Active profiles | 3 |
| Active admins | 1 |
| Active managers | 0 |
| Active members | 2 |
| Auth users | 3 |
| Auth users with matching profile | 3 |
| Auth users without profile | 0 |
| Active profiles without Auth user | 0 |

The production `profiles` table does **not** currently contain `email` or `membership_status`. A follow-up query referencing `profiles.email` failed with PostgreSQL 42703, confirming that the email column is absent. No profile or Auth values were selected or exposed in this report. No data was changed.

This is a small current inventory, not a guarantee that no concurrent signup or account change can occur before a future migration. Repeat all preflight queries immediately before any rehearsal and production migration.

## 3. Review of the test membership migration – unsafe default for production reuse

The existing test migration `20261120205122_reconcile_membership_gate_and_exercise_metadata.sql` adds:

- `profiles.email`
- `profiles.membership_status text NOT NULL DEFAULT 'approved'`
- a status check for `pending`, `approved`, and `rejected`
- an Auth-user email backfill
- a signup trigger that creates new profiles inactive and pending
- a stricter `is_active_user()` gate requiring both `active=true` and `membership_status='approved'`

The accompanying helper migration also changes `is_admin()` and `is_admin_or_manager()` to require approved membership.

**Do not copy this migration unchanged to production.** The database-level default of 'approved' is too permissive for any future profile insertion path that bypasses the Auth trigger. Production needs a fail-closed default of 'pending', with an explicit backfill for already-existing, currently active accounts.

## 4. Production-derived migration design (authoring only)

The proposed production-specific unit should be a new forward-only migration, separate from the test migration history. It must be rehearsed on a fresh isolated production restore before approval.

### Preflight assertions

Abort before any DDL if any of these conditions is not understood and explicitly reconciled:

1. An Auth user has no matching profile, or a profile has no matching Auth user.
2. Any profile has an unexpected role or active state.
3. More than one active admin exists or the current admin identity cannot be positively preserved.
4. A profile is concurrently created/modified during the release window.
5. Existing profile access policies or grants differ from the captured assumptions.
6. The trigger inventory differs from the expected single Auth profile creation path.

Capture counts and role/status distributions only; do not export personal email addresses into logs.

### Proposed schema and data semantics

1. Add `email text` as nullable initially.
2. Add `membership_status text` with a fail-closed default of `pending`, then add the check constraint allowing only `pending`, `approved`, `rejected`.
3. Backfill existing profiles from their matching `auth.users` records without logging addresses.
4. Preserve current access: explicitly mark only profiles that were already `active=true` at the migration snapshot as `approved`; do not change their existing `active` or `role` values.
5. New signups must be inserted as `active=false`, `membership_status='pending'`, role `member`.
6. The Auth trigger's conflict path may synchronize the email only; it must not overwrite role, active state, membership status, or display name.
7. The default for all future direct inserts remains `pending`. Any administrative approval path must be an explicit, separately authorized action.
8. Reconcile SELECT grants and profile UPDATE policies against production's existing policy inventory. Preserve the current admin's ability to manage membership; prevent managers from self-escalating or modifying admin/manager profiles.
9. Update `is_active_user()`, `is_admin()`, and `is_admin_or_manager()` to require active + approved membership. Keep fixed search paths and explicit EXECUTE grants; test each function with anon, pending, rejected, approved member, manager, and admin identities.

### Required rehearsal tests

- Existing admin can sign in and retains admin privileges after migration.
- Existing two active members retain their current access.
- A new signup creates an inactive pending member and cannot access protected application data or staff RPCs.
- Pending and rejected users cannot call member-only or staff-only RPCs.
- An approved active member can use member features but cannot access another member's private data.
- Manager/admin authorization is role-correct; managers cannot promote themselves or change privileged profiles.
- Replaying the migration is either safely idempotent or explicitly rejected before making changes.
- Profile/Auth row counts and IDs are unchanged; no profile is orphaned.
- Email backfill does not modify any other profile field.
- Signup trigger behavior is verified under a transaction and through the actual Auth signup flow in the isolated rehearsal environment.

### Rollback/recovery

Do not plan a blind reverse migration that drops the new columns or resets membership decisions. Recovery must be a tested restore of the isolated rehearsal snapshot or a documented forward-fix. The production release remains blocked until backup/PITR and restore evidence is supplied and a restore rehearsal is successful.

## 5. Execution boundary

Permitted: read-only production aggregate checks, source review, production-derived migration design, isolated-branch authoring and CI.

Not permitted: production or test DDL/DML, Auth trigger/policy changes, Edge Function/secrets changes, production or shared Pages deployment, or creating billable restore resources.

**B8 result:** Latest core CI is green. A production-derived Membership/Auth migration design is documented, with a safer fail-closed default than the existing test migration. No database or deployment changes were made. Release remains **NO-GO**.
