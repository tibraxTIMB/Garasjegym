# GO LIVE Phase B61 – production runtime/schema compatibility blockers
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Branch head before this document:** `f838e96d709eef0bec45b1f7aecdab2d9c52f4eb`

## 1. Critical finding: current app code is not compatible with the current production schema
Read-only comparison of the active branch source against the live production catalog found direct runtime incompatibilities.

### 1.1 Profile/auth queries
Production `public.profiles` currently has only:
`id, display_name, avatar_url, role, active, created_at, updated_at`.

The app source currently queries:
- `v2/src/lib/auth.js`: `id, display_name, role, active, avatar_url, email, membership_status`.
- `v2/src/components/Admin.jsx`: `id,display_name,email,role,active,membership_status,created_at`.

Therefore the current profile fetch/admin member list will fail against the live production schema because `email` and `membership_status` are not present. This is not fixed by emptying user rows.

### 1.2 Admin delete Edge Function
`v2/supabase/functions/admin-delete-user/index.ts`:
- selects `role,active,membership_status` from profiles, but production profiles lack `membership_status`;
- checks many related tables absent from the 18-table production schema, including `coffee_orders`, `class_live_sessions`, `challenges`, `calendar_events`, `pt_programs`, `training_sessions`, `pt_wod_assignments`, `pt_checkins`, `pt_coaches`, `pt_client_assignments`, `pt_services`, `pt_service_requests`, and `coffee_product_reviews`.

The function will fail its profile authorization query and/or its reference checks on missing tables. Do not deploy or rely on this function against the current production schema.

### 1.3 App features require additional schema
The active source also queries membership and PT/program/calendar/coffee/community features that are not all represented in production's 18 public tables. TEST currently has 46 public tables. This remains a major schema drift blocker; the clean-start data reset does not address it.

## 2. Additional bootstrap concern
`v2/supabase/functions/admin-create-user/index.ts` deliberately returns HTTP 410 and says account creation is disabled. That means it is not a viable first-admin or member onboarding mechanism. The first-admin bootstrap must be implemented and tested through a separate, owner-controlled and secure path before deleting existing admin accounts or enabling public signup.

## 3. Current launch impact
- Current production profiles cannot satisfy the app's membership-aware auth contract.
- Admin member management and deletion cannot be considered production-ready.
- Clean-start reset cannot be executed safely until first-admin bootstrap is proven.
- Schema migration plan must account for the complete app schema, not merely the 11 production ledger entries.
- All migration SQL must be tested against a disposable restored production clone before application.

## 4. Required next steps
1. Reconcile the complete v2 schema with live production and the intended SturmKopf application contract.
2. Produce a production-only migration set that excludes TEST seed/baseline/bootstrap files.
3. Implement first-owner admin creation without exposing service-role credentials or a public admin-creation endpoint.
4. Correct admin-delete-user's table/column assumptions against the final production schema; include an explicit last-admin guard and a safe reset procedure.
5. Test profile load, signup, first-admin bootstrap, member list, role checks, deletion safeguards and every app module against a production-shaped disposable database.
6. Keep production data reset, migrations and deployment blocked until recovery rehearsal and all release gates pass.

## 5. Actions taken
- Read-only inspection of current production catalog and current branch source.
- No Edge Function deployed or replaced.
- No application source changed in this phase.
- No SQL writes, Auth deletions, data reset or deployment performed.

**B61 result:** Confirmed blocking runtime/schema incompatibilities in auth/profile and admin-delete flows. Production remains NO-GO.
