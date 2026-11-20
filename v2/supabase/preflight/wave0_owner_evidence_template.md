# STURMKOPF FEUER 1.1 – Wave 0 owner evidence record

**Purpose:** Record whether a complete, isolated production recovery rehearsal has passed.  
**Never put passwords, JWTs, API keys, emails, UUIDs, Auth rows, password hashes, tokens or secret values in this file.** Keep raw exports and credentials encrypted in the owner's secure environment. This template may be copied to a private local file; do not commit a completed record containing sensitive operational metadata.

## A. Source snapshot

- [ ] Production project ref verified: `kultdmklwmilhoytrrig`
- Snapshot date/time (UTC):
- Operator:
- Supabase CLI version:
- PostgreSQL client version:
- Docker/Supabase local stack versions:
- Source PostgreSQL version:
- Source region:
- Public database backup files created (roles/schema/data/history):
- Non-empty file checks completed:
- SHA-256 manifest created and verified against second encrypted copy:
- Encryption method / secure storage locations (no keys or passwords):

## B. Auth recovery

- [ ] Official Auth migration method selected and documented.
- [ ] Auth recovery covers `auth.users`, `auth.identities`, password hashes and required Auth customizations.
- [ ] Original user UUIDs preserved.
- [ ] Email identities preserved (current baseline: 3).
- [ ] Password hashes present in source and restore (never record the hashes).
- [ ] Custom `auth.users` trigger and `public.handle_new_auth_user()` function preserved.
- [ ] Trigger SECURITY DEFINER and fixed search_path verified.
- [ ] MFA/SSO inventory checked (current baseline: 0 MFA factors, 0 SSO/SAML providers).
- [ ] Session/refresh-token strategy documented: restored or deliberately invalidated.
- [ ] If JWT signing secret differs, fresh sign-in is expected and tested.
- Auth method and version:
- Session strategy:
- Auth acceptance result:

## C. Storage and project configuration

- [ ] Bucket/object counts rechecked immediately before backup (previous snapshot: 0/0).
- [ ] If non-empty, bucket config, object bytes, paths and metadata separately backed up and restored.
- [ ] Edge Function source and deployed version/hash recorded.
- [ ] Secret names inventoried; values stored only in secure secret manager.
- [ ] Auth providers, signup, email confirmation, redirects, SMTP mode, MFA policy and JWT expiry/signing-key type reviewed.
- [ ] Leaked-password protection setting recorded.
- No secret values or personal user details recorded here.

## D. Isolated restore

- Restore target type: local / already-approved isolated target.
- [ ] Existing TEST project was not overwritten.
- [ ] No unapproved paid project/branch/compute/PITR resource was created.
- [ ] Public schema, roles, data and migration history restored or explicitly reconciled.
- [ ] Auth recovery completed with supported method.
- [ ] Custom Auth trigger/function relationship restored.
- [ ] Storage restored if needed.
- [ ] Restore rehearsal SQL completed.
- [ ] Source/restore row counts match expected invariants.
- [ ] Auth user UUID-set fingerprint matches.
- [ ] Identity UUID/link fingerprint matches.
- [ ] Profile/Auth relationship is 3/3, no orphans.
- [ ] Existing roles and active flags preserved: 1 admin, 2 members, all active.
- [ ] Standalone PR preserved (1; `workout_log_id` NULL).
- [ ] Class/booking and legacy PT session/booking rows preserved.

## E. Functional security smoke tests

- [ ] Existing admin signs in and retains admin privileges.
- [ ] Both existing members sign in and retain member access.
- [ ] Password reset and email confirmation flows tested.
- [ ] New signup (if enabled) creates member + inactive + pending.
- [ ] Pending/rejected/inactive users cannot access protected member data.
- [ ] Approved member can access only their own private data.
- [ ] Manager cannot self-edit, self-approve, deactivate or promote.
- [ ] Admin can approve/reject and manage other users as designed.
- [ ] Class booking, cancellation, capacity and waitlist behavior tested.
- [ ] PT Studio and PT booking behavior tested.
- [ ] WOD, workout history and standalone PR behavior tested.
- [ ] Music function behavior tested after membership schema is present.
- [ ] No unexpected RLS, grant, trigger or advisor regressions.

## F. Decision

- Restore result: PASS / FAIL / INCOMPLETE
- Auth recovery result: PASS / FAIL / INCOMPLETE
- Functional smoke result: PASS / FAIL / INCOMPLETE
- Outstanding deviations:
- Operator and UTC completion time:
- Owner approval for Wave 1 candidate hash:
- Owner approval for any paid resource (must be explicit and separate):

**Wave 0 passes only when A–E have evidence and no unresolved critical deviation remains.** A public-schema-only restore is not a complete Supabase project recovery. If Auth UUID/password recovery is not demonstrated, Wave 0 remains blocked and production stays NO-GO.
