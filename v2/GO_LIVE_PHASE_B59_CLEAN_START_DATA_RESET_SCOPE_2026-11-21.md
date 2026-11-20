# GO LIVE Phase B59 – clean-start data reset scope and launch bootstrap
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Production project:** `kultdmklwmilhoytrrig`  
**Decision:** CLEAN-START STRATEGY ACCEPTED; RESET NOT EXECUTED

## 1. User-approved launch direction
The owner has confirmed that legacy workout history and member content do not need to be retained for the new launch. The launch is to begin with a blank operational dataset:
- Delete existing Auth accounts and recreate users.
- Delete profile/member identity records and recreate membership.
- Delete PT messages, notes, requests, sessions, bookings, assignments and client records.
- Delete class bookings and old class schedules if they are legacy test content.
- Delete workout logs, sets, workout exercise snapshots, PRs and personal workout history.
- Delete saved/published WOD content and WOD schedules/favorites.
- Delete legacy social posts/comments and notifications.
No historic user-generated data is required for the new launch.

This is the intended reset scope; this document does not execute it.

## 2. Preserve as application seed/configuration unless separately reviewed
The reset should not blindly empty every public table. Candidate retained system content:
- `exercises`: curated exercise catalogue (56 production rows at inspection); retain if it is the approved base catalogue, remove only user-created/test rows after reviewing ownership.
- Static application configuration and reference data required for a functioning launch.
- `coffee_settings` singleton and other required singleton settings; reset to known safe defaults rather than deleting the required row.
- Schema, migrations, functions, triggers, indexes, RLS policies, grants and Storage bucket definitions.
- Application code, Edge Function source/configuration and secrets (secrets remain in their protected settings, never in repo/chat).

Classes, WODs, service catalogue, PT service configuration and coffee products require an explicit seed-vs-empty decision based on whether they are reusable base configuration or test content. Default safe launch is no old bookings or personal associations; seed only approved catalogue/config records.

## 3. Production baseline observed (read-only)
- `auth.users` count: 3.
- `public.profiles` count in list_tables: 3.
- Production has 18 public base tables, all with RLS enabled.
- Production `exercises`: 56 rows.
- Production `wods`: 1 row.
- Production `workout_logs`: 0 rows.
- Production has only the original 18 public tables; TEST has 46. A clean data reset does not fix schema drift or create the 28 TEST-only tables.
- Current production migration ledger remains 11 entries, and their original SQL source recovery is still unresolved.

No user names, email addresses, messages, booking content or personal data rows were read/exported.

## 4. Required technical sequence (not yet run)
1. Complete and approve the SturmKopf Feuer 1.1 production schema/migration plan independently of data reset. Resolve missing production migration sources and TEST-only migration separation.
2. Create owner-controlled encrypted recovery backup of schema/data/Auth identity mapping; user data may be discarded after launch, but recovery is required until the new release is stable.
3. Perform a full rehearsal against an isolated restored copy using the exact proposed reset SQL and Auth deletion/recreation sequence.
4. Decide the seed allowlist (exercise catalogue, service catalogue, classes, coffee products/settings, default WOD templates).
5. Implement reset as a dedicated, reviewed, one-time owner-run operation, not as a normal app migration that runs automatically on every deploy.
6. Ensure Auth deletion cascades cleanly to profiles and does not leave orphaned references. Do not delete the last admin until an owner-controlled new admin registration/bootstrap path is verified.
7. Configure the first new owner account and verify it can access admin features before opening signup to members.
8. Run full role-based smoke tests: admin, manager, member, anonymous; PT booking and messaging, class booking, WOD Builder, training log, PR, coffee bar, notifications, calendar, storage and Edge Functions.
9. Verify post-reset counts and zero orphan references. Only then enable the production launch.

## 5. Critical safety constraints
- The reset is irreversible for existing accounts and user data.
- No SQL DELETE/TRUNCATE, Auth user deletion, Storage object deletion or reset migration was run in this phase.
- Do not use broad `TRUNCATE ... CASCADE` or blanket `DELETE` across every public table.
- Do not remove schema or security objects as part of data reset.
- Do not disable RLS or relax grants to make reset easier.
- No production deployment or migration was performed.

## 6. Remaining launch blockers
A clean start reduces the need to preserve historic member data, but it does not waive:
- Production schema drift (18 vs 46 public tables).
- Missing source for 11 applied production migrations.
- Production authenticated TRUNCATE/TRIGGER/REFERENCES privilege exposure on 12 base tables.
- Broad default ACLs requiring owner/platform-default review.
- Backup/restore rehearsal and first-admin bootstrap verification.
- Exact release CI/artifact verification and production-specific deployment path.

**B59 result:** The owner-approved clean-start scope is documented. No destructive operation has been executed. Production remains NO-GO until the new schema, reset rehearsal, privilege remediation and release gates pass.
