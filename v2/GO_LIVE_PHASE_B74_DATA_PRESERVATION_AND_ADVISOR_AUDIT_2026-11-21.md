# B74 – Data preservation and security advisor audit
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Status: Preparation only; Production remains NO-GO.

## 1. Exercise catalogue preservation contract
A read-only query against Production confirmed 56 exercise rows, all `created_by IS NULL`, distributed as:
- CrossFit: 30
- Pilates: 15
- Styrke: 11

The exact 56 original Production exercise names and category pairs are now encoded in:
`v2/supabase/preflight/clean_start_readiness_read_only.sql`.

Important discovery: the current TEST project is not a faithful copy of Production's exercise data. It has 94 system rows (`created_by IS NULL`) with a different mix of categories; 40 of the original Production exercise names are absent and some overlapping names use different categories. The TEST project's own seed therefore cannot prove preservation of Production's original catalogue.

The preflight has been revised to check the exact 56 original names and categories, allow additive standard catalogue entries from reviewed migrations, and require zero custom `created_by` exercise rows after clean start. Run it only against an isolated restore based on the actual Production backup, not the existing TEST seed.

## 2. Full migration replay corrections
The clean local Supabase PG17 replay previously uncovered:
1. Missing `daily_wod` source migration in v2; exact root source copied unchanged to `v2/supabase/migrations/202611172000_daily_wod.sql`.
2. `20261120123330_optimize_rls_and_lock_down_rpc_grants.sql` revoked/granted `reorder_pt_program_sessions(uuid,uuid)` before that function existed in an empty database. The function is defined by the later `20261120132732_20261120214000_harden_pt_session_reorder.sql`, which already applies its own explicit revoke/grant after creation. The premature early statements have been removed; intended final privilege state is still explicitly set by the function-creation migration.

Supabase CLI is pinned at 3.2.0 in CI to avoid release-lookup rate-limit failures. A new full clean local Supabase replay is running on the updated chain; it must finish all migrations before we consider the chain syntactically/dependency complete. Subsequent database integration/restore tests remain required.

## 3. Supabase advisor audit (read-only, 2026-11-21)
### Production
- Security: 4 authenticated-executable SECURITY DEFINER functions; 1 Auth leaked-password protection warning (disabled).
- Performance: 14 unindexed foreign keys, 34 Auth/RLS initplan warnings, 3 overlapping permissive SELECT-policy groups, 10 unused-index candidates.
- Health: no advisor findings.

Overlapping permissive SELECT-policy groups:
- `exercises`: `exercises_manage_staff` and `exercises_read_members`
- `pt_session_exercises`: `pt_session_exercises_read` and `pt_session_exercises_staff_all`
- `wods`: `wods_manage_staff` and `wods_read_published`

These are consistent with the legacy policy surface in Production; the TEST migration chain includes policy consolidation. The app/role behaviour must be regression tested before replacing them. Do not drop unused-index candidates just because current query volume is low.

The four SECURITY DEFINER functions include membership helper functions used by policies and app code. Their authenticated grants are not automatically defects; inspect body and call sites before any revoke. Anon has no public-table read/write privileges in Production, and the tested public security-definer routines were not executable by anon.

### TEST
- Security: 25 authenticated-executable SECURITY DEFINER functions and the same leaked-password protection warning.
- Performance: 47 unused-index candidates.
- Health: no advisor findings.

The SECURITY DEFINER warnings in TEST need review against the complete public RPC inventory and each routine's role guards. Do not blanket-revoke business RPCs required by the UI.

## 4. Owner-run gates
`v2/GO_LIVE_OWNER_BACKUP_RESTORE_AND_ADMIN_CHECKLIST.md` now includes:
- roles/schema/data DB export using the pinned Supabase CLI;
- separate Auth, Storage, Edge Function and project-config preservation (the standard `db dump` excludes Supabase-managed Auth/Storage schemas);
- encrypted storage and isolated restore requirements;
- leaked-password protection check;
- authenticated SECURITY DEFINER grant review;
- RLS/performance warning reconciliation;
- admin login and clean-start sign-off.

No owner backup, restore, login rehearsal, data reset or Production deployment has been performed.

## 5. Release gate
- Exact Production 56-name preservation contract: encoded in read-only preflight; must pass against a Production-derived restore.
- Full clean Supabase PG17 replay: updated and retry running.
- Production migration lineage: candidate mappings only; original 11 SQL files/hashes still not recovered conclusively.
- Full encrypted backup and isolated restore: owner-run, not complete.
- Owner-admin login after membership gate: owner-run, not complete.
- Production clean-start and deployment: not performed.

**Production remains NO-GO.** Do not reset Production data or deploy until all gates above are evidenced and approved.
