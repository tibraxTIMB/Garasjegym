# GO LIVE Phase B20 – Auth and Storage recovery inventory

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** AUTH DATA MUST BE PRESERVED; STORAGE CURRENTLY EMPTY

## 1. Live production counts (read-only)

Executed aggregate counts only; no user rows, email addresses, password hashes, tokens or file paths were retrieved.

| Managed object | Production rows |
|---|---:|
| `auth.users` | 3 |
| `auth.identities` | 3 |
| `auth.sessions` | 12 |
| `storage.buckets` | 0 |
| `storage.objects` | 0 |

There are three Auth user records and three identity records. These are critical account records and must be included in the recovery design. The 12 session rows should not be relied upon for recovery: a restored environment should invalidate old sessions and require users to authenticate again.

Storage currently has no buckets or objects, so there are no current Storage object bytes to copy. Re-check immediately before any backup/restore window because users or the app may create Storage assets later.

## 2. Documentation reconciliation

Current Supabase documentation contains two relevant statements:

- The CLI `db dump` reference says it excludes managed schemas including `auth` and `storage`.
- The platform-to-self-hosted restore guide describes `auth.users` as included in its database dump workflow and separately says Storage objects must be transferred.

Because these official pages are not fully aligned on Auth inclusion, do not assume either outcome. Inspect the actual generated dump files before relying on them. Confirm whether `auth.users` and `auth.identities` appear in the schema/data dump; if not, export the necessary Auth records through a supported secure method.

Supabase's User Management documentation confirms Auth user data can be viewed/exported from the Auth schema through SQL Editor, including `auth.users`. Treat exports as highly sensitive because they may contain password hashes and personal information.

Sources:
- https://supabase.com/docs/reference/cli/supabase-db-dump
- https://supabase.com/docs/guides/self-hosting/restore-from-platform
- https://supabase.com/docs/guides/auth/managing-user-data

## 3. Required zero-budget Auth recovery procedure

1. Create a private, encrypted Auth export through the supported SQL Editor export route or a verified database dump that demonstrably contains the required Auth records.
2. Include `auth.users` and `auth.identities`; preserve user UUIDs so all public profile and foreign-key relationships remain valid.
3. Do not attempt to restore active sessions. Plan for forced re-authentication after a recovery event.
4. Keep the export encrypted and outside GitHub/chat; restrict access to the project owner.
5. Test restoration of user/identity records in an isolated compatible Supabase environment. Verify users map to the same profile UUIDs and sign-in/recovery works.
6. Document how OAuth provider identities, email confirmation state, MFA factors and password recovery will be handled. Do not claim full identity recovery until tested.

## 4. Storage recovery procedure

Current production Storage bucket/object counts are zero. Record this as the baseline and re-check at backup time. If buckets or objects appear, export bucket configuration and object bytes separately, preserve paths/content types/metadata, and test restore before GO LIVE. Database dumps alone do not preserve object bytes.

## 5. Execution boundary

Only aggregate row counts for Auth and Storage managed tables were queried. No Auth user details, password hashes, sessions, Storage objects, credentials or secrets were read/exported. No database, Auth, Storage, configuration or deployment changes were made.

**B20 result:** Production currently has 3 users, 3 identities and 12 sessions; Storage is empty. Auth users/identities must be securely preserved and tested; sessions can be invalidated on restore. The actual dump must be inspected because official CLI/restore documentation differs on Auth schema inclusion. Wave 0 remains NOT PASSED. Release remains **NO-GO**.
