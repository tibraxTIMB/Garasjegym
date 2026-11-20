# GO LIVE Phase B30 – migration lineage, exclusion rules and production release manifest

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Decision:** MIGRATION SOURCE LINEAGE NOT COMPLETE; NO PRODUCTION MIGRATION AUTHORIZED

## 1. Live ledger and repository reconciliation

Read-only repository tree and Supabase migration ledgers were compared again:
- Production project `kultdmklwmilhoytrrig`: 11 installed migration versions.
- TEST project `izwzwvlexqxqewzijhhd`: 163 installed migration versions.
- `v2/supabase/migrations`: 163 SQL migration files, aligned by version with TEST.
- Root `supabase/migrations`: a separate 15-file legacy set.
- None of the 11 production-installed version prefixes is present as a corresponding SQL migration file in either current repository migration directory.

This is a release-provenance gap. Production has its actual current catalog state and ledger, but the original source files for the 11 applied production migrations are not archived in the current branch. Do not invent source SQL or treat a similarly named TEST migration as the original production migration. Before any forward migration is prepared, recover the original migration contents from a trusted historical repository/backup or create a clearly labelled reconstructed baseline from live catalog definitions and independently review it.

## 2. Explicitly excluded TEST-only migrations

The following files are demonstrably not production release migrations:

1. `v2/supabase/migrations/20261116225942_baseline_from_production_schema_no_data.sql`
   - TEST-only baseline schema creation.
   - Recreates tables and constraints already present in production; never replay against production.

2. `v2/supabase/migrations/20261116230108_test_seed_data.sql`
   - Inserts demo exercises, a demo WOD, coffee products and a demo class.
   - Never run against production; would contaminate live user-facing data.

3. `v2/supabase/migrations/20261117090304_test_first_signup_admin_bootstrap.sql`
   - Changes the Auth signup trigger so the first newly registered account becomes admin.
   - Never deploy to production. Production account creation must not grant admin based on signup order.

The root-level `supabase/migrations` directory is also not interchangeable with `v2/supabase/migrations`. Do not concatenate or replay either directory wholesale.

## 3. High-risk reconciliation file review

Read-only review of `20261120205122_reconcile_membership_gate_and_exercise_metadata.sql` found it:
- Adds `profiles.email` and `profiles.membership_status` with default `approved`.
- Backfills profile email from `auth.users`.
- Replaces `handle_new_auth_user()` so new accounts are `active=false`, `membership_status='pending'`.
- Changes `is_active_user()` to require active and approved.
- Replaces staff profile-update policy and adjusts profile column SELECT grants.

This is a potentially appropriate intended membership gate, but it is not safe to apply by name alone. The default `approved` backfill means existing rows become approved when the column is added. Production's current baseline is three active profiles (one admin, two members). The final migration must explicitly preserve these identities/roles and define the approval state of each existing account; the owner must review that policy. New signups must remain inactive/pending and must never self-approve or become admin.

The file `20261120205011_reconcile_untracked_schema_objects.sql` adds a coffee-order column and replaces `get_coffee_stats()`. It assumes the coffee tables already exist and is not a complete coffee feature migration.

A root-level later PT-program migration was also reviewed: it assumes `pt_programs`, `pt_program_sessions`, `pt_program_templates`, and `app_private.is_pt_coach_for_member()` already exist. This confirms that isolated feature migrations have dependency assumptions and cannot be promoted independently without a dependency graph.

## 4. Production release manifest – order and acceptance

This is the intended forward-only wave order. It is a manifest, not executable SQL.

### Wave 0 – recovery (hard prerequisite)
- Owner-created encrypted production backup.
- Supported UUID-preserving Auth user/identity recovery evidence.
- Storage snapshot recheck and separate export if non-empty.
- Edge Function source/config and secret-name inventory; secrets separately protected.
- Isolated restore rehearsal, acceptance query pack, and app smoke tests.
- Do not overwrite the current TEST project or provision paid resources without explicit approval.

### Wave 1 – membership and Auth compatibility
- Reconcile `profiles.email`, approval state, signup trigger, active-user helpers, staff profile updates and grants.
- Preserve the three existing production profile/Auth UUID relationships and roles.
- New signup must be inactive/pending. First-signup admin bootstrap is prohibited.
- Validate admin/manager/member/anonymous behavior and password reset/sign-in.

### Wave 2 – class booking and capacity
- Reconcile `classes` publication/instructor metadata and `class_bookings` attendance/waitlist status.
- Inspect existing production rows against all new constraints and unique indexes before applying.
- Replace capacity trigger only after concurrency tests, row-lock tests, waitlist promotion/cancellation tests and duplicate checks pass.
- Preserve the existing unique partial index semantics until its replacement is verified.

### Wave 3 – PT Studio
- Add missing PT tables in FK dependency order.
- Preserve legacy `pt_sessions` and `pt_bookings` rows; do not replace them with test records.
- Apply coach assignments, programs, notes/messages, check-ins, requests and booking policies only after each table's member/coach/staff RLS tests pass.
- Preserve private PT content and prevent unrelated member access.

### Wave 4 – WOD, workout history and PR integrity
- Reconcile WOD schema, exercise metadata, atomic save functions, workout logs/exercises/sets and PR links.
- Preserve the existing standalone PR (its `workout_log_id` is NULL).
- Keep production `workout_logs.result_data` NOT NULL/default `{}` unless every app path and data row has been proven compatible with a reviewed alternative.
- Validate exercise-specific measurement types, including plyo box height in cm.

### Wave 5 – notifications, calendar, coffee, HR and optional integrations
- Add only features enabled in the signed release scope.
- HR preference defaults must be false.
- Do not copy TEST demo coffee products/orders, WODs, exercises or classes.
- Realtime publication and external provider configuration must be separately verified.
- Keep optional integrations disabled until their production secrets/configuration are explicitly installed and tested.

### Wave 6 – account deletion and lifecycle
- Deactivation-first; preserve workout and PR history.
- Protect the final admin account and all ownership/author references.
- Implement a compatible, audited Edge Function only after Auth/RLS and deletion tests pass.
- Do not deploy TEST-only admin create/delete functions as-is.

## 5. Per-wave mandatory controls

Every production migration package must include:
1. Exact source commit and migration file hashes.
2. Preflight SQL that is SELECT-only and stops on unexpected data/constraint conflicts.
3. Explicit rows/UUIDs/counts invariants; no hidden deletes, truncation, or broad rewrites.
4. Dependency order and transactional boundaries.
5. RLS, grants, RPC and trigger review for anon/authenticated/admin/manager/member.
6. Postflight checks and functional smoke tests.
7. Restore/forward-fix instructions rehearsed against the isolated recovery target.
8. An owner approval record for the exact migration hash set.

A migration file that contains `DROP`, `DELETE`, `TRUNCATE`, broad `UPDATE`, role/grant changes, or Auth-trigger changes must receive a specific human-reviewed data-impact statement. Idempotency alone is not proof of safety.

## 6. Execution boundary and outcome

This phase inspected repository paths, current migration ledgers and selected migration source files. No production SQL was executed, no migration was applied, no data was modified, no credentials were accessed and no deployment or paid resource was used.

**B30 result:** Migration source lineage gap confirmed: the original SQL for all 11 production-applied migrations is missing from the current branch. TEST baseline, demo seed and first-signup admin bootstrap are explicitly excluded. A dependency-ordered production release manifest is now recorded. Wave 0 remains NOT PASSED and production remains **NO-GO**.
