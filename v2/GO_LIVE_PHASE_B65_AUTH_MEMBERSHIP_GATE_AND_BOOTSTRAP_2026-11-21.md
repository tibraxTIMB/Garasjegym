# GO LIVE Phase B65 – Auth signup, membership gate and first-admin bootstrap
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Branch head before report:** `0e587054b3bc04e22a0caf3f53a22411c7608467`

## 1. Confirmed production-vs-TEST Auth trigger mismatch
Both projects have an `AFTER INSERT ON auth.users` trigger named `on_auth_user_created` that invokes `public.handle_new_auth_user()`.

### Production implementation
Production function inserts only `id, display_name, role` and defaults the new profile to:
- `role = 'member'`
- `active = true`
- no membership approval state exists.

Production `public.is_active_user()` checks only `profiles.id = auth.uid()` and `active = true`.

### TEST implementation
TEST function inserts:
- `role = 'member'`
- `active = false`
- `membership_status = 'pending'`
- `email = new.email`

TEST `public.is_active_user()` requires both `active = true` and `membership_status = 'approved'`. The TEST `is_admin()` and `is_admin_or_manager()` helpers also require approved membership.

## 2. Security and onboarding impact
This is a material authentication/authorization contract mismatch:
- Production does not enforce the TEST membership-approval gate.
- A newly created Auth user receives an active member profile automatically.
- Production `is_active_user()` does not distinguish pending, approved or rejected applicants because the column does not exist.
- The current app reads `membership_status` and expects approval-aware membership.
- The current repository `admin-create-user` Edge Function returns HTTP 410 (disabled).
- Production Edge Function inventory contains only `garasjegym-music`; the TEST admin-create/delete functions are not deployed there.

Supabase Auth signup configuration was not exposed by the connected project metadata, so this audit does not claim that public signup is currently enabled. The trigger/function behaviour itself is confirmed from the live database.

## 3. First-admin/bootstrap risk
No verified owner-controlled first-admin bootstrap flow has been established for a clean launch. The TEST-only first-signup bootstrap migration must not be replayed into production. Do not delete or reset the current admin identity until a separate bootstrap path has been tested on an isolated target and owner access is proven.

## 4. Required design
1. Decide the intended signup model: invite-only vs public request-to-join. Existing product direction is invitation/approval controlled; the production schema must enforce that server-side.
2. Define the lifecycle: Auth signup -> pending profile -> admin approval -> active approved member. Reject/disabled states must be explicit.
3. Make the trigger idempotent and safe; it must never grant admin/manager based on user-supplied metadata.
4. Ensure `is_active_user`, `is_admin`, `is_admin_or_manager` and all RLS policies use the same approved-membership contract.
5. Build a secure owner bootstrap path that does not expose service-role credentials and cannot be claimed by the first arbitrary registrant.
6. Test signup, pending denial, approval, rejection, manager permissions, admin permissions, duplicate trigger invocation, and recovery of the owner account with negative tests.
7. Only then define how existing Auth identities are treated in the requested clean-start plan.

## 5. Actions taken
- Read-only inspection of production and TEST Auth trigger definitions and function bodies.
- Read-only inspection of the active Auth gate helper definitions.
- Read-only Edge Function inventory.
- No Auth settings changed, no signup attempted, no users deleted/created, no trigger/function modified, no Edge Function deployed.

**B65 result:** Production currently has an active-by-default signup trigger and no approval-aware membership gate, unlike TEST. First-admin bootstrap remains unproven. Production remains NO-GO.
