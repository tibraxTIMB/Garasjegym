# GO LIVE Phase B19 – logical backup coverage and restore completeness gate

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** DATABASE CLI DUMP ALONE IS NOT A COMPLETE PROJECT BACKUP

## 1. Verified Supabase CLI behavior

Reviewed current Supabase CLI `db dump` reference and platform restore documentation:

- Default `supabase db dump` exports schema only; it does not include data or custom roles unless requested explicitly.
- `--data-only` is required for database data.
- `--role-only` is required for custom roles.
- The CLI runs `pg_dump` with Supabase-specific filtering and excludes managed schemas, including `auth`, `storage` and extension schemas.
- Storage object bytes are not in the Postgres database backup; the database only contains object metadata.
- The Supabase platform restore guide says Auth data and Storage objects need separate consideration when restoring outside the managed platform. The CLI dump reference's explicit exclusion of `auth` means Auth identity recovery cannot be assumed from the standard dump.

Sources:
- https://supabase.com/docs/reference/cli/supabase-db-dump
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/self-hosting/restore-from-platform

## 2. Backup coverage matrix

| Component | Standard CLI dump | Additional work required |
|---|---|---|
| Public schema, policies, functions, triggers | Yes, schema dump | Validate extensions and grants |
| Public table data | Only with `--data-only` | Row-count and integrity verification |
| Custom database roles | Only with `--role-only` | Recreate/reset role passwords securely |
| Auth users, identities, sessions | Excluded managed schema | Separate supported Auth export/recovery path; not yet demonstrated |
| Storage metadata | Excluded managed schema | Recreate/restore metadata through supported process |
| Storage object files | No | Separate object export and restore |
| Edge Functions | No | Source-controlled deployment and secrets/config inventory |
| Auth provider, SMTP, redirect settings | No | Separate configuration inventory; secrets must be stored securely |
| Realtime publications/settings | Not fully established by public schema dump | Explicit config inventory and restore tests |

## 3. Consequence for Wave 0

A successful public database dump alone is insufficient to claim full GarasjeGym recovery. Before Wave 0 can pass, define and test how Auth users/identities and Storage object files are preserved and recovered. Do not use the test project's Auth users or Storage as a substitute for production data.

If a complete Auth recovery path cannot be demonstrated on the current Free plan, the owner must decide whether to accept a documented recovery limitation (for example, forced password reset/re-authentication) or approve an alternative supported backup approach. Do not silently claim zero-data-loss recovery.

## 4. Safe backup command outline (owner workstation only)

The documented CLI workflow uses separate exports:

```bash
supabase db dump --db-url "$PRODUCTION_DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$PRODUCTION_DB_URL" -f schema.sql
supabase db dump --db-url "$PRODUCTION_DB_URL" -f data.sql --use-copy --data-only
```

The connection string must be obtained privately from the Supabase Dashboard and supplied only in the local shell environment. Never paste it into ChatGPT, GitHub, source files, logs or shell history. The files can contain sensitive member data and must be encrypted and stored outside the repository.

These commands are a starting point for the Postgres portion only. They do not back up Auth, Storage object files, Edge Functions or project settings.

## 5. Execution boundary

Documentation was reviewed and the backup coverage matrix was prepared. No production export, Auth export, Storage export, restore, migration, configuration change or deployment was performed.

**B19 result:** The zero-budget logical dump approach is useful but not yet a complete disaster-recovery solution. Wave 0 remains NOT PASSED until Auth/Storage recovery is addressed and a full isolated restore rehearsal succeeds. Production remains NO-GO.
