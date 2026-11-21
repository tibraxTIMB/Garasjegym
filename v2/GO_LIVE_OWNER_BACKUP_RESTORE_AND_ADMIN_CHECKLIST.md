# Owner runbook – encrypted Production backup, restore and single-admin verification
Target release: SturmKopf Feuer 1.1
Production project: Garasjegym
Use only in the owner's secure workstation/session. Do not paste passwords, access tokens, connection strings, recovery codes, Auth exports or backup contents into ChatGPT, GitHub, tickets or logs.

## Status
This is a preparation checklist, not evidence that a backup or restore has been run.
- No encrypted Production backup is recorded as completed.
- No isolated restore is recorded as completed.
- No owner admin sign-in rehearsal after the membership gate is recorded.
- Do not perform the clean-start reset until every required check below is signed off.

## 0. Preconditions and change freeze
1. Confirm exact Production project ref and database host in Supabase Dashboard.
2. Schedule a maintenance window and prevent training/coffee/PT writes while taking the final backup and validating row counts.
3. Use Supabase CLI 3.2.0 (same pinned version used by the current CI rehearsal) and PostgreSQL 17 client tools.
4. Store connection details in the owner's password manager / process environment. Do not put credentials in shell history or command arguments where avoidable.
5. Create a private, encrypted backup directory with restrictive permissions on a volume separate from the working copy. Confirm free disk space.
6. Do not point any restore command at the Production connection string.

## 1. Database backup (owner-run)
Supabase CLI's `db dump` excludes Supabase-managed schemas such as `auth`, `storage`, and extension schemas. Default schema dump also excludes data and custom roles. Therefore roles, schema and data are separate exports; Auth/Storage and their project configuration need separate preservation and verification.

In a secure shell, set the remote connection string in the environment variable `SUPABASE_DB_URL` (do not put the literal value in this file or chat). The current v3 CLI accepts `--remote` with the connection string:
```bash
umask 077
mkdir -p "$HOME/secure-backups/garasjegym-feuer-1-1"
cd "$HOME/secure-backups/garasjegym-feuer-1-1"

supabase --version
supabase db dump --remote="$SUPABASE_DB_URL" -f roles.sql --role-only
supabase db dump --remote="$SUPABASE_DB_URL" -f schema.sql
supabase db dump --remote="$SUPABASE_DB_URL" -f data.sql --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"

sha256sum roles.sql schema.sql data.sql > SHA256SUMS
```

Check that the CLI output's `Target:` is the expected Production database before accepting each export. Verify that all three files are non-empty, that `sha256sum -c SHA256SUMS` passes, and that the dump logs contain no errors. Store the hashes with the backup record.

### Encrypt and retain
Encrypt each dump and the manifest using the owner's approved file-encryption tool (for example, age with a recipient public key controlled by the owner). Keep the private key/recovery method separately. Verify decryption in a separate temporary directory and then securely remove unencrypted working copies according to the owner's retention policy. Never upload unencrypted or encrypted database dumps to this repository.

Example with age already installed and the owner's recipient public key saved locally as `$AGE_RECIPIENT`:
```bash
for f in roles.sql schema.sql data.sql SHA256SUMS; do
  age -r "$AGE_RECIPIENT" -o "$f.age" "$f"
done
sha256sum *.age > ENCRYPTED_SHA256SUMS
```
Do not put the recipient's private key in the same location as the backup.

## 2. Preserve Supabase-managed data and project configuration separately
The database dump above is not a complete Supabase project backup. Record and protect these items separately:
- Auth users and identities, user metadata, app metadata, MFA factors and relevant Auth configuration/provider settings. Use the Supabase-supported export/backup path or an owner-controlled Admin API export. A plain SQL dump from `db dump` does not include `auth.users`.
- Storage buckets, object inventory and object bytes; bucket policies and any RLS/custom triggers on managed Storage tables.
- Edge Function source/config, deployment versions, JWT verification settings and secret names. Recover secret values only into the owner's secret manager, never into Git.
- Auth redirect URLs, SMTP/provider settings, Site URL, OAuth credentials, webhooks and other Dashboard project settings.
- Supabase Auth's leaked-password protection is currently reported disabled in both Production and TEST. The owner should enable it in Auth password/security settings and verify the effective setting before accepting new member registrations.
- The database advisor reports four authenticated-executable SECURITY DEFINER helpers in Production. These include membership predicates used by app/RLS; do not revoke them blindly. Review the bodies, call sites, and grants and confirm all are intentional. The TEST project reports 25 such functions, each needing the same grant/body review.
- Production performance advisor findings at the latest read-only audit: 14 unindexed foreign keys, 34 RLS initplan warnings, 3 overlapping permissive SELECT-policy groups, and 10 unused-index candidates. RLS initplan/overlapping-policy findings should be reconciled with the TEST policy-consolidation migrations; unused-index candidates should not be dropped solely because the project has had low query volume.
- Realtime publication and any customizations to managed schemas (Auth/Storage triggers/policies). The full local rehearsal must explicitly validate these objects.
- External integrations, DNS/hosting settings and the current Production app URL.

For each item, record the export method, timestamp, project ref, version, object count or checksum where possible, and the person responsible. A screenshot of settings is not a substitute for export of underlying user or object data.

## 3. Isolated restore rehearsal
Use a separately authorized, disposable Supabase project/environment running PostgreSQL 17. Do not use Production, the current TEST project's live data, or a paid new branch without checking its cost first.

1. Restore cluster roles from `roles.sql` using the documented owner-approved PostgreSQL restore procedure.
2. Restore schema from `schema.sql` into the empty isolated database.
3. Before data restore, review default privileges: Supabase documents that target defaults may grant broad privileges; revoke inappropriate defaults (especially table defaults for anon/authenticated) before recreating application grants.
4. Restore `data.sql`.
5. Restore Auth and Storage according to the separately approved procedure; do not assume the SQL exports include them.
6. Reconcile extension versions, Postgres version, Auth settings, Storage buckets/objects, publications, policies, triggers, functions, grants, secrets and Edge Functions.
7. Confirm counts and hashes for every exportable component.
8. Run `supabase migration list --remote=<isolated-target>` and compare migration lineage. Do not force-mark migrations as applied or alter the ledger to silence differences.
9. Apply the reviewed forward-only migration candidate to the isolated restore and run the full app integration, privacy and negative-access suite.
10. Prove restore rollback/recovery by recreating the isolated target from the encrypted backup and repeating the validation.

Required sign-off: exact backup ID/hash, restored target ref, start/end timestamps, row/object counts, migration replay result, test run URLs, unresolved differences and owner approval.

## 4. Owner-admin bootstrap and login rehearsal
The existing Production owner-admin identity must remain. Do not delete, disable, demote or replace it during this preparation.

In the isolated restored target:
1. Apply the reviewed membership-gate candidate only after preflight confirms exactly three existing linked Auth/Profile rows (one active admin + two active members) or the candidate is revised to match the actual restored snapshot.
2. Confirm all existing profile IDs and the admin role are preserved; current active accounts become approved according to the reviewed migration logic.
3. Verify a new signup becomes `role=member`, `active=false`, `membership_status=pending`.
4. Verify pending and rejected users cannot access member data; ordinary members see only their profile and own records; managers cannot grant roles, approval state or activation; only the admin can approve/reject and change roles.
5. Sign in to the actual isolated web app using the owner's normal login method. Confirm correct admin UI access, logout/login, password recovery and MFA (where configured). Do not record or share passwords or recovery codes.
6. Verify the admin identity still matches the owner-controlled Auth identity and profile. Keep the owner-admin identity unchanged.

Only the owner can provide the final evidence that the correct credentials work. A SQL fixture or successful policy test is not an actual login test.

## 5. Clean-start checklist – execute only after owner sign-off
The agreed clean start is a data reset, not a schema reset.

Preserve:
- exactly one verified owner-admin Auth identity and its profile;
- all 56 standard system exercises (`created_by IS NULL`: CrossFit 30, Pilates 15, Styrke 11);
- safe singleton coffee settings;
- all schema, migration history, constraints, indexes, functions, triggers, RLS policies, grants, Auth configuration, Storage configuration and integration setup.

Clear operational/member-specific records:
- all non-owner member accounts/profiles only after their linked operational records have been safely removed/archived according to the approved retention decision;
- WODs and assigned/saved WODs, schedules, favorites, workout logs, exercises-in-logs, sets, PR/history;
- PT clients/assignments, services/requests, programmes/sessions/bookings/check-ins/notes/messages and related notifications;
- group classes, bookings, live sessions, attendance and results;
- coffee products/orders/order items/reviews (except safe singleton settings);
- social posts/comments/reactions, challenges/participants, notifications, calendar events and other member activity.

Do not implement one broad `TRUNCATE ... CASCADE` without an approved dependency-aware deletion plan and a verified restore. First produce per-table before/after counts and an explicit allowlist. Retain standard exercise rows by stable IDs or strict `created_by IS NULL` verification. Verify the result with read-only SQL after reset.

## 6. Final Go/No-Go acceptance record
Do not set GO until all boxes below have owner evidence:
- [ ] Encrypted Production database backup completed and hash-verified.
- [ ] Auth and Storage export/config backup completed and verified.
- [ ] Edge Function sources/config and secrets preserved securely.
- [ ] Isolated full restore completed from encrypted backup.
- [ ] Full Supabase migration replay from empty state passes.
- [ ] Migration lineage from all 11 Production ledger entries is reconciled.
- [ ] Full 46-table schema, RPC, trigger, grant, view and RLS surface passes integration checks.
- [ ] Cross-member privacy and assigned-coach negative/positive tests pass.
- [ ] Owner admin login, approval, recovery and role permissions pass in the isolated restored app.
- [ ] Before/after data reset plan reviewed, with 56 exercise rows retained.
- [ ] Owner approves maintenance window and final Production change.

Until then: Production NO-GO. No Production reset, Auth deletion, DDL/DML, Edge Function deployment or go-live deployment.
