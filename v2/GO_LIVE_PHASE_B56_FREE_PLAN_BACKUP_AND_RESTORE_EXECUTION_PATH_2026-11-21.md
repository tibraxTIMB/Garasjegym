# GO LIVE Phase B56 – Free Plan backup and restore execution path

**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Production project:** `kultdmklwmilhoytrrig`  
**TEST project:** `izwzwvlexqxqewzijhhd`  
**Decision:** Wave 0 remains NOT PASSED; no production change authorized

## 1. Current Supabase backup capability and plan constraint

Supabase's current documentation states:
- Automatic daily database backups are provided for Pro, Team and Enterprise projects.
- Free-plan projects should regularly export data using Supabase CLI `db dump` and keep off-site backups.
- Supabase database backups do not contain Storage file objects; Storage objects must be exported separately.
- PITR is a paid add-on and requires at least a Small compute add-on; this is outside the zero-budget release constraint unless the owner explicitly approves a cost.

Official sources:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/auth/managing-user-data
- https://supabase.com/docs/guides/storage/management/download-objects

The available connected Supabase actions in this workflow can inspect schema, migrations, advisors, projects and functions. They do not expose an action to create/download a database dump or execute a restore rehearsal. No connected backup API operation was available in the discovered tool surface.

## 2. Owner-run backup package (no paid resources)

Run on an owner-controlled computer with Supabase CLI, Docker Desktop and PostgreSQL client tools installed. Use the production project's **Connect** panel to obtain a session-pooler connection string. Do not paste the connection string, database password, access token, service-role key or exported user data into ChatGPT, GitHub, issue trackers or chat.

Create a new access-controlled directory on an encrypted disk, outside the repository. Example file names:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `auth-users.csv` and `auth-identities.csv` (separate restricted exports)
- `storage-inventory.csv` and, if non-empty, downloaded object files
- `edge-functions-inventory.txt` plus source archives
- `restore-notes.txt`
- `SHA256SUMS.txt`

Use the documented CLI dump commands, substituting the connection string only in the local terminal environment:

```bash
supabase db dump --db-url "$PRODUCTION_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$PRODUCTION_DB_URL" -f schema.sql
supabase db dump --db-url "$PRODUCTION_DB_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

Keep the dump files outside the repository. Protect the output directory with full-disk encryption and a separate secure off-site copy. Generate SHA-256 checksums locally and record file sizes, UTC capture time, CLI version and source project ref. A checksum verifies file integrity; it does not prove that the dump restores.

## 3. Auth and identity preservation

Supabase documents exporting user information through SQL Editor by querying `auth.users`; include `auth.identities` in a separate restricted export. These exports contain sensitive personal data and must remain outside GitHub and ChatGPT.

At minimum, verify and record:
- All production Auth user UUIDs and identity UUIDs.
- Email and provider mapping needed to re-establish sign-in.
- Every existing `public.profiles.id` still maps to the same `auth.users.id`.
- Role and active-state mapping for the existing admin and two members.
- Auth provider settings, redirect URLs, SMTP configuration and MFA settings are recorded separately; they are not proven by a database dump alone.

Do not export passwords, session tokens, JWT signing secrets or service-role keys into a report. Do not create substitute Auth users or change UUIDs.

## 4. Storage and Edge Functions

Database backup metadata is not a backup of Storage file contents. Inspect Storage buckets and object counts. If any objects exist, export them with the Supabase CLI `supabase storage` commands or an S3-compatible client, preserving bucket names, paths and access configuration. Record checksums and compare object counts after restore.

Inventory all deployed Edge Functions, source code, import maps, configuration and required secret *names*. Keep secret values in a separate password manager or encrypted secret store; never commit them to the repository. Verify that function source is recoverable and that required secrets can be re-entered by the owner.

## 5. Restore rehearsal – safe target only

Do not restore into the existing TEST project and do not overwrite production.

A restore rehearsal requires an isolated target project/database with compatible PostgreSQL and Supabase platform versions. If a new Supabase project or branch would incur any charge, stop and obtain explicit cost approval first. Do not create paid resources under this plan.

Restore the role, schema and data dumps following the current Supabase CLI backup/restore documentation. Restore Auth, Storage, provider settings and Edge Functions according to their separate procedures. The database restore must preserve the original UUIDs and relational integrity.

Acceptance checks:
1. Compare critical production table row counts before and after restore.
2. Confirm the three known production profile/Auth UUID relationships and roles.
3. Verify all foreign keys and constraints.
4. Verify RLS is enabled and grants/policies/functions/triggers match the captured catalog.
5. Test admin, member and anonymous access boundaries.
6. Test sign-in, sign-out and password reset using a safe test account, not a production user's credentials.
7. Verify Storage object counts and sample downloads if buckets are non-empty.
8. Verify Edge Functions can be deployed/configured in the isolated target without exposing secrets.
9. Run application smoke tests for WOD, workout logging, PR, class booking and PT workflows.
10. Record failures and resolve them before considering Wave 0 passed.

A successful SQL import alone is not a restore acceptance test.

## 6. Owner evidence handoff

Wave 0 can be marked passed only after the owner provides confirmation of:
- Backup package exists on encrypted local/off-site storage.
- Capture timestamp, file list, sizes and SHA-256 checksums recorded.
- Auth UUID/identity export secured and profile relationships reconciled.
- Storage object inventory/export completed where applicable.
- Edge Function source/config inventory secured.
- Restore rehearsal completed in an isolated target, with acceptance checks and smoke tests passed.
- No paid resource or production mutation was used without explicit approval.

Do not upload the actual backup, Auth exports, credentials or secrets into this repository. A redacted evidence summary and checksums may be documented; never include personal data.

## 7. Execution boundary

This phase only reviewed current Supabase documentation and wrote this owner-run procedure. No database backup was created, no restore was attempted, no new project or branch was created, no production data was exported, and no production or TEST database was changed.

**B56 result:** A documented zero-budget path exists using owner-run CLI exports and separate Auth/Storage/Edge Function recovery. It is not evidence that a backup has been taken or restored. Wave 0 remains **NOT PASSED** and production remains **NO-GO** until owner-run evidence is supplied and independently checked.
