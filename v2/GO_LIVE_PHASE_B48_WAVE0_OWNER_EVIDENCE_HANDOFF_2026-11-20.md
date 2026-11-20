# GO LIVE Phase B48 – Wave 0 owner evidence template prepared

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** owner-side recovery evidence handoff  
**Decision:** TEMPLATE READY; OWNER BACKUP/RESTORE NOT PERFORMED

## 1. Artifact created

Added `v2/supabase/preflight/wave0_owner_evidence_template.md`.

It provides a structured record for:
- Source snapshot, tool versions and encrypted public database backup.
- Auth recovery method, UUID/identity/password-hash preservation and custom Auth trigger.
- Storage snapshot and project-level Auth/Edge Function configuration inventory.
- Isolated restore target, migration history and row-count invariants.
- Role/RLS, signup, password reset, class booking, PT Studio, WOD, PR and music smoke tests.
- Final pass/fail/incomplete decision and owner approval of the exact Wave 1 candidate hash.

It explicitly forbids recording credentials, tokens, email addresses, UUIDs, password hashes or secret values. Raw backup files remain encrypted and outside GitHub. The existing TEST project must not be overwritten and no paid resource may be created without explicit cost approval.

## 2. Current blocker

The owner must perform the backup and restore on a trusted workstation or already-approved isolated target. The connected GitHub/Supabase tools cannot securely run the local Docker/CLI recovery process or manage the owner's encrypted backup copies.

Supabase's current Auth migration guidance supports moving Auth users, identities and hashed passwords using a full backup or SQL export/import; standard public database CLI dumps alone remain insufficient. A different JWT secret invalidates existing tokens, so fresh sign-in must be tested. See official guidance: https://supabase.com/kb/troubleshooting/migrating-auth-users-between-projects and https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore.

## 3. Execution boundary and outcome

Only a documentation template was committed. No backup was created, no Auth data was exported, no restore target was provisioned, and no database, Auth, Storage, Edge Function, secret or hosting configuration was changed.

**B48 result:** Owner evidence template is ready. Wave 0 remains NOT PASSED until the owner completes the encrypted backup, supported Auth recovery and isolated functional restore. Production remains **NO-GO**.
