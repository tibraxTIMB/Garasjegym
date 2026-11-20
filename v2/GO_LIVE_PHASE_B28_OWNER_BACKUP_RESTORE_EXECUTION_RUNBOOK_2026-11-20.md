# GO LIVE Phase B28 – owner backup/restore execution runbook and fresh platform inventory

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Decision:** OWNER-RUN BACKUP PROCEDURE UPDATED; AUTH RECOVERY REMAINS A HARD BLOCKER

## 1. Fresh live inventory

Read-only Supabase inventory rechecked:
- Production project `kultdmklwmilhoytrrig`: ACTIVE_HEALTHY, PostgreSQL 17.11.0.019, eu-west-2.
- Isolated TEST project `izwzwvlexqxqewzijhhd`: ACTIVE_HEALTHY, PostgreSQL 17.12.0.000, eu-north-1.
- Production migration ledger: 11 entries.
- TEST migration ledger: 163 entries. Histories remain independent; never replay TEST's chain into production.
- Production Edge Functions: only `garasjegym-music`, ACTIVE v2, `verify_jwt=false`, source SHA-256 `3e369166c2c425c20c0e6af8e49adeaeef96c6e192479102f09a6acde1850e69`.
- TEST Edge Functions: `admin-create-user` and `admin-delete-user`; neither is deployed in production.
- Production music function source manually validates the supplied bearer token against Supabase Auth and checks that the profile is active before returning now-playing data. It uses server-side service role and Soundtrack secrets. Its source and secret names/values must be included in recovery inventory; secret values must never be committed or sent in chat.
- Branch protection endpoint remains unverified because the GitHub integration lacks permission to read that administrative endpoint.

No changes were made to either Supabase project.

## 2. Current CLI documentation correction

The current Supabase CLI reference now uses `--remote`. The older `--db-url` option is deprecated in CLI v3 and removed in v4. Use the currently documented syntax and check `supabase --version` before running. The official CLI reference explicitly says standard CLI dumps exclude managed schemas including `auth` and `storage`, and that schema/data/roles require separate dump invocations.

Current official instructions:
- CLI dump reference: https://supabase.com/docs/reference/cli/supabase-db-dump
- CLI backup/restore guide: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## 3. Owner workstation – public database logical backup

This procedure is intentionally not run by ChatGPT. It must be performed by the project owner on a trusted workstation, with Docker Desktop, Supabase CLI and PostgreSQL client tools installed.

1. Create a private backup directory outside the Git repository, e.g. `GarasjeGym-recovery-YYYYMMDD-HHMM-UTC`.
2. Use a database connection string copied directly from the production project's Supabase Connect panel. Keep it in a private environment variable or approved local secret manager; never paste it into chat, GitHub, source code or a shared log.
3. Confirm the target project reference is `kultdmklwmilhoytrrig` and the CLI version is understood. Do not rely on an implicit linked project.
4. Run the current documented commands, using the private connection string in `PRODUCTION_DB_URL`:

```bash
supabase db dump --remote="$PRODUCTION_DB_URL" -f roles.sql --role-only
supabase db dump --remote="$PRODUCTION_DB_URL" -f schema.sql
supabase db dump --remote="$PRODUCTION_DB_URL" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

5. Preserve migration history separately, as described in the official backup/restore guide, if the restore target requires it. Do not substitute the TEST migration ledger.
6. Confirm each command exits successfully and produces a non-empty file. Record CLI version, source project ref, UTC snapshot time, filenames, sizes and SHA-256 hashes in a private manifest.
7. Encrypt the backup and retain two access-controlled copies in separate locations. Never commit dumps or hashes plus data to GitHub. The manifest can be private, but it must not contain credentials.

**Important:** This is the public Postgres logical backup only. It is not a complete Supabase project backup.

## 4. Auth recovery – unresolved, mandatory decision

The current CLI dump documentation excludes managed `auth` and `storage` schemas. Production currently has 3 Auth users, 3 identities and 12 sessions. A public database dump therefore cannot be accepted as preserving those identities.

Before Wave 0 can pass, the owner must demonstrate a supported and tested way to recover:
- `auth.users` and `auth.identities`, preserving the UUIDs required by `public.profiles` and foreign keys.
- Password verification data (`encrypted_password`) and email confirmation/provider identity state, without exposing hashes or tokens.
- Any MFA-related records required by the actual account configuration.
- The custom `auth.users` trigger and its `public.handle_new_auth_user()` function, plus relevant Auth configuration.
- A secure post-restore sign-in and password-reset flow.

Supabase's Auth migration guidance describes migrating the Auth schema, including users and hashed passwords, using a full backup or SQL export/import. The separate User Management guide describes exporting `auth.users` and `auth.identities` from the SQL Editor; that is useful for inventory/export but a CSV alone is not accepted as a tested restore procedure. Standard `supabase db dump` still excludes managed `auth` and `storage` schemas, so do not mistake the public schema dump for the Auth backup. Use a documented Auth-schema recovery method and prove it in an isolated compatible environment.

Do not manually insert selected rows into managed Auth tables, invent replacement user UUIDs, or assume that an SQL export alone is a supported restore. Active sessions and refresh tokens may be intentionally discarded to force re-authentication; they are not required to match the source snapshot if the owner explicitly chooses that security posture. If sessions are restored, verify their behavior in the target. A different JWT secret invalidates old tokens; require fresh sign-in. If a supported Auth recovery method cannot be demonstrated on the current Free plan, record that as an explicit recovery limitation and keep production NO-GO until the owner approves an acceptable, tested recovery design.

## 5. Storage, Edge Functions and project configuration

- Recheck `storage.buckets` and `storage.objects` immediately before backup. Previous baseline was zero/zero. If still empty, record that snapshot fact. If non-empty, export bucket configuration, object bytes, paths and metadata separately and test restore.
- Preserve the production `garasjegym-music` Edge Function source, dependency/import configuration and deployment metadata. Its secret names include `SOUNDTRACK_API_TOKEN` and `SOUNDTRACK_SOUND_ZONE_ID`; capture secret values only in the owner's secure secret manager, never in GitHub/chat. Supabase-managed `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are not to be copied into source control.
- Record Auth provider, redirect URL, SMTP, OAuth, Realtime publication, webhook and other project-level configuration. Secret values are stored separately and are not printed in the inventory.
- Do not deploy the TEST-only `admin-create-user` or `admin-delete-user` Edge Functions to production as part of backup/recovery.

## 6. Restore rehearsal boundary

The current Free organization already has the production and TEST projects. Do not create a third hosted project, paid branch, upgrade, compute add-on or PITR subscription without a fresh cost quote and explicit approval. Do not overwrite the existing TEST project with production data.

A zero-budget public-schema rehearsal may use a local Supabase stack, but it is not a full Supabase managed Auth restore. Use a disposable local environment and a compatible Postgres/Supabase stack; document compatibility differences from production PostgreSQL 17.11.0.019. Run `v2/supabase/preflight/restore_rehearsal_read_only.sql` only against the restored local target. Compare counts against the backup snapshot, then run app smoke tests using isolated credentials.

A successful public-schema rehearsal does not pass Wave 0 until the Auth recovery method is also demonstrated. The Auth acceptance query's user UUID, identity UUID/link and password-hash-presence checks must match; session/refresh-token fingerprints are informational if the rehearsal deliberately invalidates sessions.

## 7. Explicit stop conditions

Stop and do not deploy if:
- Any dump command fails, or any file is empty unexpectedly.
- SHA-256 checksums do not match the second secure copy.
- Auth users/identities cannot be recovered with their original UUIDs using a supported method.
- RLS, grants, triggers, functions, migration history or schema invariants differ unexpectedly.
- The app smoke test fails for login, class bookings, PT Studio, WOD, training history or PRs.
- The only available restore target would overwrite TEST or incur unapproved cost.

## 8. Execution boundary and result

This phase only performed fresh metadata/source inventory and updated the owner procedure. No production data was exported, no credentials or Auth records were read, no Storage objects were accessed, no migration was applied, no Edge Function/secret was changed and no deployment or paid resource was used.

**B28 result:** The owner backup runbook now uses current CLI syntax and explicitly addresses managed Auth/Storage, the production music function and the TEST-only admin functions. Production and TEST are healthy; their migration histories remain independent. Wave 0 remains NOT PASSED until a complete, supported Auth recovery and isolated restore are demonstrated. Production remains **NO-GO**.
