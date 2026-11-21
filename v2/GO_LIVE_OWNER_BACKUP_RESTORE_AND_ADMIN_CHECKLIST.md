# Owner runbook – protected Production backup, isolated restore and clean-start launch
Target release: SturmKopf Feuer 1.1
Production project: `kultdmklwmilhoytrrig`
Policy: ZERO COST. No paid Supabase branch/project/plan. No Production reset or deployment without separate explicit final owner GO LIVE authorization.

> **Binding clean-start contract (supersedes older 56-exercise / existing-admin-retention instructions in earlier GO LIVE documents):** The new operational installation starts with exactly one newly created owner-controlled admin/Auth identity and no legacy Auth users, identities, profiles, members or managers. Clear all legacy operational data, including coffee settings/products/orders, WODs, workout history, PRs, PT and class records, messages, notifications, calendar and social content. Preserve the complete application schema, functions, triggers, constraints, indexes, RLS policies, grants and required integration configuration. Preserve the reconciled standard exercise catalogue; its current 135-name manifest remains provisional until alias/category review. Modules remain functional but start empty. The old Production admin is preserved only in the protected rollback backup and isolated restore, not carried into the clean-start target.

## Status
This is an owner execution checklist, not evidence that backup/restore/reset has been performed.
- Production backup: NOT VERIFIED.
- Isolated restore and old owner-admin rollback login: NOT VERIFIED.
- Clean-start rehearsal and new owner-admin login: NOT VERIFIED.
- Production reset/deploy: NOT AUTHORIZED.

## 1. Protected zero-cost Production backup
Follow the detailed current procedure in:
- `GO_LIVE_PHASE_B81_ZERO_COST_BACKUP_AND_RESTORE_RUNBOOK_2026-11-21.md`

Use only the owner's secure workstation. Never paste passwords, connection strings, service-role keys, Auth exports, backup data, MFA recovery codes or secrets into ChatGPT or GitHub.

Minimum backup requirements:
- Protected, encrypted database backup with schema, data and roles, plus checksums.
- Explicit proof of whether Auth users, identities, hashed passwords, sessions and MFA can be restored. The standard Supabase CLI `db dump` is not presumed to include managed Auth schema/data.
- Auth provider/security settings, redirect URLs, SMTP/OAuth config and MFA policy recorded separately.
- Storage object bytes and metadata, Edge Function source/config/secrets, Realtime publications, extensions and required project settings protected separately.
- Production migration ledger and schema/catalog capture retained.
- Backup completeness verified locally; do not call it Auth-preserving unless an isolated restore proves it.

Do not use Supabase paid clone/branch features. If a complete, restorable backup cannot be demonstrated with free local tools, stop: Production remains unchanged.

## 2. Isolated restore rehearsal – rollback source only
Restore the protected Production backup into a fresh local Supabase stack on PostgreSQL 17 using free local Docker/Supabase CLI tooling. Do not restore into live Production or the existing TEST project.

On the isolated restored copy:
1. Verify database schema, rows, roles, RLS, policies, grants, functions, triggers, constraints, indexes, extensions and migration ledger.
2. Verify Auth configuration and whether users, identities, password hashes and MFA records are genuinely restored.
3. Verify Storage buckets and object bytes, Realtime and Edge Function dependencies.
4. Sign in with the old owner-admin credentials on this isolated restored copy. This is rollback validation only.
5. Run `v2/supabase/preflight/restore_rehearsal_read_only.sql` and `v2/supabase/preflight/auth_restore_acceptance_read_only.sql`.
6. Preserve the restored copy as a recovery source. Do not carry its legacy Auth identities or operational data into the clean-start result.

If any restore-critical component is absent, stop. A CSV user list or database-only dump is not proof of Auth recovery.

## 3. Production migration lineage and schema reconciliation
Production has 11 applied migration ledger entries. The exact original timestamped SQL files for these entries have not been recovered from the active branch. Four files have same-name suffix matches with different timestamps; they are not proven identical originals. See:
- `GO_LIVE_PHASE_B82_PRODUCTION_MIGRATION_LINEAGE_GAP_2026-11-21.md`
- `GO_LIVE_PHASE_B89_PRODUCTION_LINEAGE_AND_FUNCTION_AUDIT_2026-11-21.md`

Do not fabricate historical SQL, force-mark migrations as applied, or edit the live ledger manually. Continue checking owner-controlled local archives and releases. If exact originals cannot be recovered, derive a forward-only reconciliation from the verified Production restore and rehearse it there.

Production function differences to reconcile:
- `is_active_user()`, `is_admin()`, and `is_admin_or_manager()` must enforce approved membership as in the current TEST target.
- `book_pt_session(uuid)` must only book public unassigned sessions (`client_id IS NULL`).
- Review all SECURITY DEFINER RPCs by intended caller and authorization boundary. Do not blanket-revoke helpers used by RLS.
- Enable leaked-password protection in Auth security settings and verify the effective setting.
- Run positive and negative class/PT/member-isolation tests against the Production-shaped restored schema.

## 4. Clean-start rehearsal – isolated Production restore only
This is a separate operation from backup/restore. Rehearse the exact reset against the isolated Production-derived restored copy. Never run the reset rehearsal in Production.

**Preserve:**
- All application tables and schema (46 expected public application tables).
- All required migrations/reconciliation, RPCs, functions, triggers, constraints, indexes, RLS policies, grants and integration interfaces.
- The complete reviewed system exercise catalogue from `v2/supabase/catalog/exercise_catalogue_manifest_sturmKopf_feuer_1_1.json`.
- Required Auth/Storage/Realtime/Edge Function configuration, with secrets held securely outside GitHub.
- The app modules and all workflows: PT Studio, WOD Builder, timers, group classes, messaging, coffee bar, calendar, PRs and member features.

**Remove all legacy identities:**
- All old Auth users, identities, sessions, refresh tokens and MFA factors.
- All old profiles, admins, managers and members.
- Do not preserve the old Production admin as the launch account. It remains only in the protected rollback restore.

**Clear all legacy operational data:**
- WODs, schedules, assignments, favourites and saved WODs.
- Workout logs, sets, workout snapshots, PRs and training history.
- PT requests, bookings, waitlists, check-ins, notes, messages, programmes, sessions and client links.
- Group classes, bookings, live sessions, attendance and results.
- Coffee settings, products, orders, order items, reviews and activity; initialize new default settings only where the module requires them.
- Notifications, activity logs, calendar events, social posts/comments/reactions, challenges/participants, preferences and other member-specific content.
- Custom/user-created exercise rows; retain the approved standard system catalogue only.

**Create the new owner account:**
- Create exactly one new owner-controlled Auth user and its profile.
- Confirm exactly one Auth identity is linked to that user.
- Confirm exactly one active, approved admin profile exists; no legacy profiles, managers or members remain.
- Verify the new owner can sign in to the clean-start app and access all admin functions.
- Do not open member signup until the owner-admin login and approval flow pass.

**Acceptance checks:**
1. Run `v2/supabase/preflight/clean_start_readiness_read_only.sql` before the reset; treat profile/Auth sections as legacy inventory.
2. Run the reset only in the isolated rehearsal copy using the reviewed dependency-aware procedure.
3. Create the new owner-admin Auth user and profile.
4. Run `v2/supabase/preflight/clean_start_post_reset_acceptance_read_only.sql`.
5. Run `v2/supabase/preflight/exercise_catalogue_manifest_assertions.sql`.
6. Confirm zero legacy operational rows, exactly one new owner Auth user/profile/identity, no old profiles, and intact schema/security contracts.
7. Re-test every module with an empty dataset and the new owner admin.

The current catalogue has 135 distinct names, but this is provisional until semantic-alias and category review is approved. Do not assume 56 or 94 is the final count. Possible duplicate candidates are documented in the manifest; do not delete or merge names without a reviewed alias strategy.

## 5. Release gates – all required before Production GO LIVE
- [ ] Encrypted Production backup complete, checksummed and locally verified.
- [ ] Full Auth/Storage/config backup coverage proven.
- [ ] Free isolated restore completed and old owner-admin rollback login verified.
- [ ] Exact Production migration lineage recovered or forward-only reconciliation derived from the verified restore.
- [ ] Production-shaped schema/RLS/Auth/functions reconciliation rehearsed.
- [ ] `admin-delete-user` deployed with JWT verification enabled after schema reconciliation and all positive/negative function tests pass; it is currently missing in Production although the client invokes it.
- [ ] `admin-create-user` remains disabled (HTTP 410); no in-app account creation.
- [ ] Positive and negative class/PT/member-isolation tests pass.
- [ ] Leaked-password protection enabled and verified.
- [ ] Exercise semantic aliases and category mapping reviewed; exact catalogue manifest approved.
- [ ] Clean-start rehearsal completed on isolated restored copy.
- [ ] Exactly one newly created owner-admin Auth identity/profile verified.
- [ ] All legacy Auth identities and operational rows absent from clean-start rehearsal.
- [ ] All app modules and workflows work on empty clean-start dataset.
- [ ] Zero-cost requirement preserved; no paid service introduced.
- [ ] Owner has reviewed evidence, maintenance window and rollback plan.
- [ ] Separate explicit final owner GO LIVE authorization received.

Until every gate passes: **Production NO-GO.** No Production reset, Auth deletion, schema/data mutation, Edge Function deployment or app deployment is authorized by this checklist.
