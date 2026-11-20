# GO LIVE Phase B67 – production clean-start inventory and sole-admin preservation
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Production project:** `kultdmklwmilhoytrrig`  
**Branch:** `garasjegym-2.0-sturm­kopf`  
**Mode:** READ-ONLY INVENTORY; NO RESET

## 1. Fresh production inventory
Read-only `list_tables` inspection returned 18 public base tables, all with RLS enabled. Non-zero row counts:
| Table | Rows | Clean-start treatment |
|---|---:|---|
| profiles | 3 | retain only the owner admin profile |
| exercises | 56 | retain as standard reference catalogue; all rows have NULL created_by |
| wods | 1 | clear |
| workout_exercises | 3 | clear |
| pt_sessions | 1 | clear |
| pt_bookings | 1 | clear |
| personal_records | 1 | clear |
| classes | 1 | clear |
| class_bookings | 1 | clear |

The following production tables were observed with zero rows: workout_logs, workout_sets, pt_requests, pt_messages, pt_client_notes, pt_session_exercises, social_posts, social_comments and member_preferences.

A separate aggregate-only SQL query (no personal fields selected) confirmed:
- profiles: 1 active admin, 2 active members.
- exercises: all 56 rows have `created_by IS NULL`; category distribution is CrossFit 30, Pilates 15, Styrke 11.
- No profile names, emails, Auth IDs or message contents were queried.

The existing admin profile is a viable candidate to preserve as the sole launch account, subject to verifying owner login and matching Auth identity before any member deletion. This avoids deleting the only admin before a replacement bootstrap exists.

## 2. Clean-start treatment
- Preserve the 56-row exercise catalogue as standard app reference content. It is not WOD history, a saved WOD, member training history or member-created content; the catalogue is unattributed/system-owned in the current production schema.
- Clear the WOD row and all WOD schedules/favorites/assignments when the complete schema is reconciled.
- Clear coffee products, orders, order items, reviews and activity; preserve only required singleton settings reset to safe defaults.
- Clear all class schedules, bookings, attendance and results.
- Clear PT sessions, bookings, requests, messages, notes, assignments, programs, check-ins and client data.
- Clear PRs, training logs, workout snapshots/sets, social activity, challenges, notifications, calendar activity and member preferences.
- Retain one verified admin Auth user/profile only. Remove the two member identities only after restore rehearsal and confirmation that no other system/service dependency relies on them.

## 3. Execution remains gated
This inventory does not authorize immediate production deletion. Before execution:
1. Complete the production schema contract and production-only migration chain; the 18-table production schema still differs from the 46-table TEST schema.
2. Recover missing applied production migration source and reconcile all tables, RPCs, policies, grants, triggers, storage and Edge Functions.
3. Owner creates an encrypted backup and rehearses restore into an isolated target.
4. Verify the current admin can sign in and has the correct owner-controlled Auth identity.
5. Rehearse the exact one-time cleanup against the restored target, including Auth and Storage references.
6. Run the production reset only after all checks pass, then verify one admin and zero legacy operational rows.

## 4. Actions taken
- Read-only production table/row-count inventory.
- Aggregate-only role and exercise-catalogue ownership/category query.
- No row content or personal identifiers queried.
- No DELETE, TRUNCATE, Auth changes, Storage changes, migrations, deploy, merge or rebase.

**B67 result:** The current production data already has exactly one active admin and two active members. The standard exercise library is 56 system/unattributed reference rows and can be retained. The WOD, PT, class and other operational data identified above are legacy content to clear during the rehearsed reset. Production remains NO-GO pending schema, recovery and security gates.
