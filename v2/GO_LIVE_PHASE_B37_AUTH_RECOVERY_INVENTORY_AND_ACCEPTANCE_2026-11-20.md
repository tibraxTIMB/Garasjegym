# GO LIVE Phase B37 – Auth recovery inventory and restore acceptance

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** read-only production Auth metadata and recovery design  
**Decision:** AUTH RECOVERY PACKAGE PREPARED; RESTORE EVIDENCE STILL REQUIRED

## 1. Production Auth baseline captured without exposing PII

A fresh read-only query against production project `kultdmklwmilhoytrrig` returned:
| Auth object/check | Count/result |
|---|---:|
| `auth.users` | 3 |
| Users with a non-empty password hash | 3 |
| Confirmed email users | 3 |
| `auth.identities` | 3 |
| Orphan identity rows | 0 |
| Users without an identity row | 0 |
| `auth.sessions` | 12 |
| Orphan session rows | 0 |
| `auth.refresh_tokens` | 12 |
| Refresh tokens with missing session link | 0 |
| `auth.mfa_factors` | 0 |
| `auth.sso_providers` | 0 |
| `auth.saml_providers` | 0 |

The check did not select or return email addresses, UUIDs, password hashes, refresh-token values, MFA secrets or identity payloads. It produced only counts, orphan checks and deterministic UUID-set fingerprints for offline source/restore comparison.

The current Auth schema includes sensitive user columns such as `encrypted_password`, confirmation/recovery tokens and metadata; identity payloads and refresh tokens are also sensitive. Never put raw Auth exports in GitHub, ordinary chat, email or unencrypted folders.

## 2. Auth trigger inventory

Production has one non-internal trigger on `auth.users`:
- `on_auth_user_created`
- AFTER INSERT on `auth.users`
- calls `public.handle_new_auth_user()`
- function is SECURITY DEFINER
- fixed `search_path=pg_catalog, public, pg_temp`

This trigger is part of the recovery contract. A restored Auth database must preserve the trigger and function relationship or deliberately recreate it from the verified source. Test actual sign-up after restore: a broken profile trigger can prevent account creation. Do not run signup tests against production.

## 3. Auth acceptance SQL added and production-validated

Added `v2/supabase/preflight/auth_restore_acceptance_read_only.sql`. It is SELECT-only and emits:
- User, identity, session, refresh-token, MFA and SSO/SAML counts.
- Deterministic MD5 fingerprints of user UUID sets, identity UUID sets, identity-to-user/provider links and session/factor UUID sets.
- Orphan checks for identities, sessions, MFA factors and refresh-token/session relationships.
- Count of users with a non-empty password hash (never the hash itself).
- Non-internal triggers on the Auth schema and their function security settings.

The fingerprint query executed successfully against production. The separate Auth trigger inventory also executed successfully. Re-run both query sections against the isolated restore and compare source/target outputs. The user UUID set, identity UUID/link set and password-hash-presence count must match for a same-identity recovery. Session and refresh-token counts/fingerprints are informational: if the owner deliberately invalidates all sessions for security, they are expected to differ and fresh sign-in must succeed. Fingerprints are integrity checks, not a substitute for sign-in tests.

## 4. Supported recovery approach and critical limitation

Current Supabase documentation confirms:
- The Auth schema is not exposed through the auto-generated Data API; user exports can be made through the Dashboard SQL Editor from `auth.users` and `auth.identities`.
- Supabase's Auth migration guidance documents migration of the Auth schema including users and hashed passwords using a full backup or SQL export/import.
- Standard `supabase db dump` deliberately excludes managed schemas such as `auth` and `storage`; it is therefore not a complete Auth/Storage backup by itself.
- If the destination project has a different JWT secret, existing JWTs become invalid and users must sign in again. Preserving password hashes and identity relationships is distinct from preserving live sessions.

For this project, do not rely on a public-schema dump or a CSV user list alone as proof of recoverability. Owner-run recovery must explicitly cover the Auth objects required by the actual production schema, including users, identities, sessions/refresh-token relationships, Auth trigger/function customizations and any non-empty MFA/SSO state. Preserve user UUIDs so existing `profiles.id` relationships remain valid.

A local Docker/Supabase rehearsal may be a zero-hosting-cost candidate, but it is not accepted until the owner proves the matching Auth schema/service version can restore the actual source export and that sign-in, password verification, identity linking, profile trigger and role/RLS behavior work. Do not assume a generic PostgreSQL restore is an Auth service restore. Do not create a paid hosted project or branch without explicit cost approval.

## 5. Owner-run Wave 0 evidence checklist

Keep all raw exports encrypted and outside the repository. Record only non-sensitive evidence in the release log:
1. Export timestamp/timezone and source project ref.
2. Export method and exact Supabase CLI/Auth service versions.
3. Files included (database roles/schema/data; Auth schema; Storage metadata/objects if non-empty; migration history; custom Auth triggers/functions; Edge Function source/config inventory).
4. SHA-256 hashes of each encrypted backup artifact.
5. Isolated restore target and whether it is local or hosted; disclose any cost before provisioning.
6. Auth source/restore counts and UUID/identity fingerprints match.
7. Existing three accounts retain their UUIDs, identities and password verification; actual sign-in works in the isolated target.
8. Existing profile-to-Auth links remain 3/3 with no orphans; admin and member role checks pass.
9. Auth signup creates a profile through the preserved trigger; new account is inactive/pending after the membership migration is rehearsed.
10. Restore outcome, warnings, owner and timestamp recorded.

Never copy the production JWT signing secret, service-role key, database password or Soundtrack secrets into the repository or chat. If testing a separate target with a different JWT secret, expect old access/refresh tokens to be invalidated and prove fresh login instead.

## 6. Execution boundary and outcome

Only read-only Auth metadata/count queries and trigger catalog inspection were run against production. No raw Auth rows were exported. No Auth settings, users, identities, sessions, triggers, functions, database objects, Edge Functions, secrets or hosting were changed.

**B37 result:** Auth source baseline and privacy-safe restore acceptance query are prepared and production-validated. The actual encrypted export and isolated restore have not been performed. Wave 0 remains blocked; production remains **NO-GO**.
