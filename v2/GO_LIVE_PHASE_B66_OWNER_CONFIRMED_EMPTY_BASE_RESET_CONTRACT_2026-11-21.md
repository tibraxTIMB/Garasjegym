# GO LIVE Phase B66 – owner-confirmed empty operational base and reset contract
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Production project:** `kultdmklwmilhoytrrig`  
**Work branch:** `garasjegym-2.0-sturm­kopf`  
**Decision:** FULL CLEAN-START DATASET CONFIRMED; EXECUTION STILL GATED

## 1. Owner instruction
The owner has reiterated that the new release is to start from a completely clean operational base:
- Exactly one account with the admin role at launch.
- No legacy WODs, saved WODs, schedules, favorites, workout logs, sets, PRs or training history.
- No legacy coffee products, orders, order items, reviews or coffee activity.
- No old classes, class schedules, class bookings, attendance or class workout results.
- No old PT clients, coach/member assignments, service requests, programs, sessions, bookings, check-ins, notes or messages.
- No legacy social posts/comments/reactions, challenges, notifications, calendar events or other member activity.
- No other legacy member accounts or profiles.

This is a data reset, not a schema reset. Keep the release schema, migrations, functions, triggers, constraints, indexes, RLS policies, grants and required application configuration.

## 2. Reference catalogue and system configuration
A clean operational base must remain usable:
- Retain or reseed only the approved standard exercise catalogue as reference content for WOD Builder. The production catalogue currently contains 56 rows; ownership/content still needs validation so user-created or test-only entries are not carried forward.
- Start WOD content itself empty. Do not retain the current production WOD row or demo/test WODs.
- Start coffee products and orders empty. Keep only the required coffee settings singleton, reset to safe default values.
- Start classes and PT schedules/bookings empty. Keep only schema/configuration required to create new classes and PT services after launch; do not carry forward old schedule or booking rows.
- Keep static system configuration only where required by the app. Do not preserve operational test content merely because a table has rows.

## 3. Admin identity rule
At the end of reset, exactly one verified owner-controlled Auth identity and one matching profile must exist, with role=admin and active/approved state consistent with the new membership gate.
- Do not delete the current last working admin until the replacement/bootstrap path has been rehearsed and the new admin login has been verified.
- Do not rely on first-signup-wins or user-editable metadata to grant admin.
- No admin identity has been created, deleted or modified in this phase.

## 4. Mandatory sequence
1. Finish the release schema contract and production-only migration chain; resolve the 18-vs-46 table mismatch and missing production migration source lineage.
2. Recover and review all schema, Auth, Storage and Edge Function state into an owner-controlled encrypted backup. Keep credentials and exports out of chat and Git.
3. Restore that backup into an isolated target and rehearse the exact schema upgrade, reset SQL, Auth cleanup/bootstrap, Storage cleanup (if any), and verification.
4. Define an explicit seed allowlist and verify the standard exercise catalogue source; all other operational data starts empty.
5. Verify the secure first-admin bootstrap and test the sole admin login before removing any old identity.
6. Run the one-time reset only after the rehearsal passes. Reset must be a dedicated owner-run operation, not an automatically repeated app migration.
7. Verify exactly one admin/profile, zero legacy operational rows, no orphan references, RLS still enabled, correct grants and successful role-based app smoke tests.
8. Deploy SturmKopf Feuer 1.1 only after the release artifact and production-specific gates pass.

## 5. Current evidence and restrictions
- Production currently has 3 Auth users and 3 profiles; 56 exercise rows and 1 WOD row were observed in read-only metadata.
- Previous audits found production schema drift (18 public base tables versus 46 in TEST), missing production tables/RPCs, privacy policy differences, and a mismatch in membership approval behaviour.
- A clean data reset does not fix those structural or security issues.
- No DELETE, TRUNCATE, Auth user deletion/creation, Storage object deletion, migration application, production deployment, merge or rebase was performed for this phase.
- Do not use blanket TRUNCATE CASCADE or delete all public rows. Preserve schema/security objects and required singleton configuration.

**B66 result:** The clean-start data intent is now explicit: one owner-admin, no legacy WOD/coffee/class/PT/member activity. The standard exercise catalogue is treated as reference seed content only, subject to validation. Production remains NO-GO until the schema, backup/restore rehearsal, bootstrap and security gates pass.
