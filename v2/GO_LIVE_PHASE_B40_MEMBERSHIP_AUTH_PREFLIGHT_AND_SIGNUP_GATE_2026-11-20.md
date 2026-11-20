# GO LIVE Phase B40 – production Membership/Auth preflight and signup activation finding

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** read-only production membership/Auth preflight  
**Decision:** WAVE 1 MIGRATION REQUIRED; NEW-SIGNUP ACTIVATION DEFAULT IS A RELEASE SECURITY FINDING

## 1. Production membership preflight – current snapshot

The new SELECT-only preflight was executed against production. It returned:
| Check | Result |
|---|---:|
| Profiles | 3 |
| Active profiles | 3 |
| Inactive profiles | 0 |
| Active admins | 1 |
| Active managers | 0 |
| Active members | 2 |
| Unexpected roles | 0 |
| Auth users | 3 |
| Auth users without profile | 0 |
| Profiles without Auth user | 0 |
| Duplicate Auth email groups | 0 |
| Profile RLS | Enabled |
| Profile policies | 2 |
| Anon SELECT on profiles | False |
| Authenticated SELECT on profiles | True |
| Auth signup trigger | 1 |

No user IDs, email addresses or profile values were selected.

## 2. New-signup activation finding

The live production `profiles.active` column has default `true`.

The `auth.users` AFTER INSERT trigger `on_auth_user_created` calls `public.handle_new_auth_user()`. The current function inserts only `id`, `display_name` and `role`; it does **not** explicitly set `active`. Consequently, a new profile created by this trigger inherits `active=true`.

The live `public.is_active_user()` helper checks only `active=true`; it does not check an approval/membership status (the `profiles.membership_status` column is currently absent). Therefore, **if Supabase Auth signup is enabled for the project**, a newly registered account created through this trigger would receive an active member profile by default. The application currently has its own account-creation restrictions, but the project-level Auth provider/signup setting was not accessible through the read-only project tooling in this phase. Treat this as a high-priority latent security issue until the owner verifies signup configuration and Wave 1 changes the database defaults/trigger.

No new account was created and no signup setting or trigger was changed.

## 3. Existing identity preservation and migration design

The current snapshot is internally consistent:
- 3 Auth users ↔ 3 profiles.
- 1 active admin, 0 active managers, 2 active members.
- No orphaned Auth/profile rows, unexpected roles or duplicate Auth email groups.

The production-specific Wave 1 migration must:
1. Add `membership_status` with fail-closed default `pending`, not `approved`.
2. Backfill only the three existing active profiles to `approved` after a fresh maintenance-window preflight, preserving IDs, roles and `active` values.
3. Change `profiles.active` default to `false` for future inserts.
4. Update `handle_new_auth_user()` to explicitly insert `active=false`, `membership_status='pending'`, role `member`, and the Auth email.
5. Ensure its conflict path updates email only, never role, active state, membership status or display name.
6. Update `is_active_user()`, `is_admin()` and `is_admin_or_manager()` to require both active and approved membership.
7. Keep the existing admin's privileges and ensure manager cannot self-promote or approve their own account.
8. Test new signup, pending/rejected access denial, approval, admin/manager/member role boundaries, password reset and email synchronization on the isolated restore.

The existing TEST migration with `membership_status DEFAULT 'approved'` is not safe to replay unchanged. The separate `active DEFAULT true` issue must also be corrected; changing only the trigger function is insufficient because other direct profile insertion paths could omit `active`.

## 4. New preflight artifact

Added `v2/supabase/preflight/membership_auth_wave_preflight_read_only.sql`. It returns only aggregate counts, column/default flags, RLS/policy/grant state and Auth trigger/helper security flags. It was executed successfully against production and must be re-run immediately before any isolated rehearsal or approved migration.

## 5. Execution boundary and outcome

Only SELECT queries were executed. No profile/Auth data was changed; no signup was attempted; no trigger, function, column default, Auth provider setting, RLS policy, Edge Function, secret or hosting configuration was changed.

**B40 result:** Existing three accounts are consistent, but the production signup trigger currently relies on an `active=true` default. This is a high-priority Wave 1 security correction and must be verified against the actual Auth signup setting. Production remains **NO-GO** pending Wave 0 recovery and isolated Wave 1 rehearsal.
