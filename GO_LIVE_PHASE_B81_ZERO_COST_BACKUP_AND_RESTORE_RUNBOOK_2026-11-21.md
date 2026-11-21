> **Clean-start policy update (2026-11-21):** This runbook's earlier Auth-preserving restore, existing-admin, 56-exercise and coffee-settings-retention instructions are superseded by **B83 – Clean-start data contract**. The approved target is one newly created owner admin, exactly 94 reviewed system exercises, and no legacy Auth users or operational history (including group classes and messages). Keep a protected rollback backup, but do not require old Auth identities to be restored into the new operating database. Do not reset or deploy Production until every B83 gate is met and the owner gives explicit final GO LIVE authorization.

# B81 – Zero-cost production backup and isolated restore runbook
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Policy: ZERO COST. No paid Supabase branch, project upgrade, or cloud restore environment.

## Free test infrastructure already working
The GitHub repository is public, so the current standard GitHub-hosted Actions workflows can run the free CI jobs without consuming a private-repository monthly minutes allowance. The current workflow has:
- Disposable PostgreSQL 17 services for migration/security candidate tests.
- A disposable local Supabase stack for full migration replay.
- Auth signup and RLS release-contract assertions.
- A serialized full Supabase replay queue. A later push must no longer cancel an active full replay.

Latest fully successful end-to-end run before this runbook: GitHub Actions run 44885332578, commit 82f90de5f7200e3c7551b45e93d11a281c17cdfa. All four jobs passed, including full migration replay, release Auth/RLS contract and real Auth signup gate.

This validates the tested migration chain against the isolated TEST baseline and fixtures. It is not a restore of live Production.

## Free options and limits
1. GitHub Actions (free for this public repo): use ephemeral PostgreSQL 17 and local Supabase containers for automated rehearsals.
2. Local Supabase CLI + Docker Desktop (free software): owner can create a temporary local restore target on an existing computer. No new hosted project required.
3. Existing Supabase TEST project: continue integration testing, but do not treat it as a Production clone.
4. No paid Supabase development branch: do not create one; the quoted branch compute is not zero.
5. No production access from CI: never add the Production database password, service-role key, or Auth secrets to GitHub Actions just to automate the restore.

## Owner-run backup – trusted computer only
Use the Production project's Connect panel to obtain its database connection string. Store it in a shell variable locally; do not paste it into ChatGPT, a GitHub issue, a commit, or a shared terminal transcript.

```bash
read -s -p "Production DB connection string: " PRODUCTION_DB_URL
echo
export PRODUCTION_DB_URL

mkdir -p "$HOME/garasjegym-backup-$(date +%Y%m%d)"
cd "$HOME/garasjegym-backup-$(date +%Y%m%d)"
umask 077

supabase --version
supabase db dump --db-url "$PRODUCTION_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$PRODUCTION_DB_URL" -f schema.sql
supabase db dump --db-url "$PRODUCTION_DB_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"

sha256sum roles.sql schema.sql data.sql > SHA256SUMS.txt
```

Use the Supabase CLI and Docker; do not replace supabase db dump with a raw full-database pg_dump command. The CLI applies Supabase-specific filtering. Current Supabase documentation:
https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
https://supabase.com/docs/reference/cli/supabase-db-dump

### Mandatory Auth completeness check
Supabase documentation pages currently describe managed-schema filtering and Auth restore contents differently in their examples. Therefore do not assume the three dumps above preserve Auth. Inspect the generated files locally without displaying sensitive rows:

```bash
grep -nE 'CREATE TABLE (IF NOT EXISTS )?auth\.|COPY auth\.(users|identities|sessions|refresh_tokens|mfa_factors)' schema.sql data.sql || true
```

If the required Auth tables/rows are absent, stop. Do not label this backup Auth-preserving and do not perform clean start. Use a separately validated Auth export/restore method supported by the exact current Supabase CLI/platform versions. The read-only Auth fingerprint SQL in v2/supabase/preflight/auth_restore_acceptance_read_only.sql is a verification aid, not a backup.

Also export/record separately, using the dashboard or owner-controlled secure storage:
- Auth provider configuration, redirect URLs, SMTP settings, CAPTCHA/password settings and MFA policy.
- Edge Function source and deployment configuration/secrets (never put secrets in the repo).
- Storage object files themselves; database dumps only contain metadata for objects.
- Realtime publication/configuration and enabled extensions.
- Current production migration ledger and catalog capture.

Keep backup encrypted at rest and off the GitHub repository. Do not upload raw backups or PII here.

## Local restore rehearsal
Use a fresh local Supabase stack with PostgreSQL 17, not the live Production project and not the existing TEST project. Keep this local copy isolated and do not expose it to the internet.

The exact restore procedure must follow the current official Supabase guide and the generated dump contents. The owner should not run a restore until Auth coverage has been proven. If a compatible local restore target cannot be prepared from the free local stack, keep the release blocked rather than silently switching to a paid cloud branch.

After restore, run:
- v2/supabase/preflight/restore_rehearsal_read_only.sql
- v2/supabase/preflight/auth_restore_acceptance_read_only.sql
- v2/supabase/preflight/production_catalog_capture_read_only.sql
- v2/supabase/preflight/release_security_contract_assertions.sql

Compare the Auth fingerprint from source and restored target. Test login using the existing owner/admin identity in the isolated target, and test a new pending signup. Verify the standard exercise catalogue still has 56 rows, all with created_by IS NULL. Verify all schema objects, constraints, indexes, triggers, RLS policies, grants, functions, extensions and migration ledger.

## Clean-start rehearsal (isolated restore only)
Only after the restore is verified:
1. Prepare a transactionally reviewed cleanup script against the isolated restore.
2. Preserve schema, migrations, functions, triggers, policies, grants and config.
3. Preserve the 56 standard exercises and safe singleton coffee settings.
4. Ensure one owner-controlled admin remains and can log in.
5. Remove operational/member data in the isolated copy only.
6. Run clean_start_post_reset_acceptance_read_only.sql.
7. Verify no operational rows remain and exactly one active approved admin is available.

Do not execute the clean-start script in Production during this rehearsal.

## Release gate
Production stays NO-GO until:
- Auth-preserving backup has been independently proven.
- Restore rehearsal has been completed and the owner/admin can log in on the isolated copy.
- Production-specific migration lineage has been reconciled against the live 11-entry ledger.
- Full production-shaped schema and RLS migration has passed positive and negative member-isolation tests.
- Data reset plan is transactionally tested and rollback/recovery is available.
- Only then: explicitly scheduled production migration, clean-start, and app deployment.

No production changes are authorized by this runbook. All production checks remain read-only.