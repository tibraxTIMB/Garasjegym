# B81 – Zero-cost production backup and isolated restore runbook
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Policy: ZERO COST. No paid Supabase branch, project upgrade, or cloud restore environment.

> **Current binding clean-start contract (2026-11-21):** Production must first be captured in a protected, verified rollback backup. The new operational installation starts with exactly one newly created owner-controlled admin/Auth identity. Do not carry over old Auth users, identities, profiles, members or managers. Do not carry over operational history (including coffee orders, training logs, PRs, saved WODs, favourites, classes/bookings/waitlists/attendance, messages, PT records, notifications, calendar events or social activity). Preserve the complete application schema, security, functions, triggers, configuration and the reconciled standard exercise catalogue. Modules remain available but start empty. The catalogue is currently a **provisional 135-name manifest** pending semantic-alias and category review; do not treat 135 as final until that review is approved. No Production reset or deploy is authorized by this runbook.

## Free test infrastructure
The public GitHub repository can run the standard GitHub-hosted Actions workflows without consuming a private-repository monthly minutes allowance. The current workflow includes:
- Disposable PostgreSQL 17 services for migration/security candidate tests.
- A disposable local Supabase stack for full migration replay.
- Exact exercise-manifest, schema/RPC/RLS and Auth signup contract assertions.
- A serialized full Supabase replay queue so later pushes do not cancel an active database replay.

These workflows validate the tested migration chain against isolated fixtures. They are not a restore of live Production and do not prove that Production can be reset safely.

## Free options and limits
1. GitHub Actions (free for this public repo): ephemeral PostgreSQL 17 and local Supabase containers for automated rehearsals.
2. Local Supabase CLI + Docker Desktop (free software): owner can create a temporary local restore target on an existing computer. No new hosted project required.
3. Existing Supabase TEST project: continue integration testing, but do not treat it as a Production clone.
4. No paid Supabase development branch: do not create one; paid branch compute is not zero-cost.
5. No Production credentials in CI: never add the Production database password, service-role key, Auth secrets or backup files to GitHub Actions.

## Owner-run protected Production backup – trusted computer only
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

Use the Supabase CLI and Docker; do not replace `supabase db dump` with a raw full-database `pg_dump` command. The CLI applies Supabase-specific filtering. Current Supabase documentation:
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/reference/cli/supabase-db-dump

### Mandatory backup completeness checks
The dump commands above are **not presumed to be a complete backup**. Inspect generated files locally without displaying sensitive rows:

```bash
grep -nE 'CREATE TABLE (IF NOT EXISTS )?auth\.|COPY auth\.(users|identities|sessions|refresh_tokens|mfa_factors)' schema.sql data.sql || true
```

If the required Auth schema/rows are absent, stop. Do not label the backup Auth-preserving. Use a separately validated Auth export/restore method supported by the exact current Supabase CLI/platform versions. The read-only Auth fingerprint SQL in `v2/supabase/preflight/auth_restore_acceptance_read_only.sql` is a verification aid, not a backup.

Export/record separately in owner-controlled secure storage:
- Auth provider configuration, redirect URLs, SMTP settings, CAPTCHA/password settings and MFA policy.
- Edge Function source, deployment configuration and secrets (never put secrets in the repo).
- Storage object files themselves; database dumps only contain object metadata.
- Realtime publication/configuration and enabled extensions.
- The current Production migration ledger and a read-only schema/catalog capture.

Keep the backup encrypted at rest and outside GitHub. Do not upload raw backups or PII here. Preserve the untouched backup as the rollback source even though the new operational installation will not retain legacy Auth or operational records.

## Isolated Production restore rehearsal
Restore the protected Production backup into a fresh local Supabase stack using PostgreSQL 17. Do not restore into live Production or the existing TEST project. Keep the local copy isolated and do not expose it to the internet.

The exact restore procedure must follow the current official Supabase guide and the generated dump contents. Do not run a restore until Auth coverage has been proven. If a compatible local restore target cannot be prepared using the free local stack, keep the release blocked rather than switching to a paid cloud branch.

On the restored, isolated copy:
- Run `v2/supabase/preflight/restore_rehearsal_read_only.sql`.
- Run `v2/supabase/preflight/auth_restore_acceptance_read_only.sql` and compare the Auth fingerprint with the Production source.
- Run `v2/supabase/preflight/production_catalog_capture_read_only.sql`.
- Run `v2/supabase/preflight/release_security_contract_assertions.sql`.
- Verify schema objects, constraints, indexes, triggers, RLS policies, grants, functions, extensions, migration ledger, Auth settings and Storage/Realtime configuration.
- Confirm the existing owner/admin can log in to this isolated restored copy. This proves rollback recoverability only; it does not mean the old identity will be migrated into the clean-start target.

## Clean-start rehearsal – isolated restored copy only
Only after the Production restore and rollback checks pass, prepare and rehearse the clean-start procedure on the isolated restored copy.

The clean-start result must satisfy all of the following:
1. Preserve application schema, migrations, functions, triggers, constraints, indexes, RLS policies, grants and required configuration.
2. Remove all legacy Auth users, identities, sessions, MFA factors, profiles, members and managers. Create exactly one new owner-controlled admin/Auth identity and verify that it can sign in.
3. Remove all operational/member history: coffee orders; workout/training logs and PRs; saved WODs and favourites; group classes, bookings, waitlists and attendance; messages/conversations; PT bookings, requests, waitlists, notes and session history; notifications/activity logs; calendar events; social posts/comments; and any other user-generated operational rows.
4. Keep the full canonical standard exercise catalogue, based on the reviewed manifest and exact acceptance assertion. The current 135-name manifest is provisional until semantic aliases and category mapping are approved; do not hard-code 56 or 94 as the release count.
5. Keep the application modules and their workflows intact. They start empty; do not remove their tables, policies, RPCs, Edge Function interfaces or client functionality.
6. Do not carry over legacy coffee settings or other singleton operational state unless explicitly reclassified as immutable system configuration by the reviewed contract.
7. Run `v2/supabase/preflight/clean_start_post_reset_acceptance_read_only.sql` and the exact exercise-manifest assertion.
8. Verify there is exactly one new active approved owner admin, no legacy users/profiles, zero operational history, complete standard exercise catalogue, and intact security/schema contracts.

Do not execute the clean-start script in Production during this rehearsal.

## Production migration lineage
Production has an 11-entry migration ledger. The exact timestamped SQL sources for the full ledger have not been recovered from the active branch history; four suffix-near-match files are not proof of identical historical SQL. Do not fabricate historical migrations, edit the live ledger manually, or assume the TEST migration chain is an exact Production history.

Continue searching owner-controlled archives and release artifacts for the exact originals. If they cannot be recovered, the isolated Production restore must be used to derive a documented, forward-only reconciliation plan. Validate that plan against the restored copy and prove it is repeatable and safe before any Production change.

## Release gate – Production remains NO-GO until every item passes
- Protected Production backup exists, is encrypted, checksummed and independently verified to include the rollback-critical database and Auth/configuration content.
- Restore rehearsal completed on a free isolated local stack; existing owner/admin rollback login verified.
- Clean-start rehearsal completed on the isolated restore: exactly one newly created owner admin, no legacy Auth or operational history, all modules/schema/security retained.
- Exercise manifest semantic aliases and category mapping reviewed and approved; exact count and manifest assertion are final.
- Production-specific 11-entry migration lineage recovered or a forward-only reconciliation plan has been derived from the verified Production restore and rehearsed.
- Full Production-shaped schema, RLS and Auth migration passes positive and negative member-isolation tests, including assigned-coach/PT/class privacy.
- Edge Function and integration dependencies are reconciled; no client action calls an undeployed or unsafe function.
- Reset plan is transactionally tested and rollback/recovery is available.
- Zero-cost requirement is preserved; no paid Supabase branch, plan or service is introduced.
- Only after all gates pass: explicit final owner GO LIVE authorization, scheduled Production migration, clean-start and app deployment.

No Production changes are authorized by this runbook. Production checks remain read-only until separate explicit final authorization.
