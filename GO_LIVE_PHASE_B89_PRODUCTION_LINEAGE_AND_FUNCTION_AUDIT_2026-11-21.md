# B89 – Production lineage and live security function audit
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch: `garasjegym-2.0-sturm­kopf`
Audited branch HEAD before this report: `65829c38144921478c6dca83d96295e43fd14889`

## Scope
Read-only Supabase MCP audit of Production project `kultdmklwmilhoytrrig` and TEST project `izwzwvlexqxqewzijhhd`. No DDL, DML, Auth, settings, storage, or deployment action was performed.

## Production migration ledger
Production has 11 applied migration records. The active branch has 166 migration SQL files and TEST reports 164 applied migrations. None of the 11 Production entries has an exact timestamp+filename match in the active branch migration directory.

| Production version | Migration name | Exact source in branch | Same-name suffix file |
|---|---|---:|---|
| 20261116213905 | lock_down_manager_profile_updates | No | None |
| 20261116214010 | restrict_trigger_function_execution | No | None |
| 20261116214020 | restrict_anon_security_definer_rpc | No | None |
| 20261117191749 | workout_result_scoring_fields | No | None |
| 20261117210956 | align_workout_log_result_data | No | 20261117210959_align_workout_log_result_data.sql |
| 20261118184920 | wod_timer_settings_and_exercise_metadata | No | None |
| 20261118194052 | exercise_prescription_profiles | No | 20261118194828_exercise_prescription_profiles.sql |
| 20261119223903 | revoke_anon_security_definer_execute | No | None |
| 20261119224030 | harden_production_security_definer_paths | No | None |
| 20261120214242 | secure_pt_session_capacity | No | 20261120110502_secure_pt_session_capacity.sql |
| 20261120214355 | revoke_anon_public_table_access | No | 20261120091100_revoke_anon_public_table_access.sql |

The four suffix matches have different timestamps. They are not proof of byte-identical historical SQL and must not be substituted into the live ledger. No original SQL has been reconstructed or fabricated. Continue searching owner-controlled local backups/release archives; if unavailable, derive and rehearse a forward-only reconciliation from the verified Production restore.

## Read-only function comparison
Four functions trigger the Production security advisor warning for authenticated execution of SECURITY DEFINER functions. The function definitions and grants were compared between Production and TEST.

| Function | Production | TEST | Assessment |
|---|---|---|---|
| `is_active_user()` | Checks `active = true` only | Also requires `membership_status = 'approved'` | Production membership gate is weaker |
| `is_admin()` | Checks active admin role | Also requires approved membership | Production staff gate is weaker |
| `is_admin_or_manager()` | Checks active admin/manager role | Also requires approved membership | Production staff gate is weaker |
| `book_pt_session(uuid)` | Accepts any published session, including client-linked sessions | Requires `client_id IS NULL` | Production booking boundary is weaker |

All four functions use a fixed `search_path=pg_catalog, public, pg_temp`, are owned by postgres, and deny EXECUTE to `anon`. They remain executable by `authenticated`. The three `is_*` helpers are used by RLS and should not be blindly revoked: doing so could break policy evaluation. Their SECURITY DEFINER status is intentional to read protected profile rows without RLS recursion; the exposed boolean result is scoped to the caller's `auth.uid()`. `book_pt_session` is an intentional authenticated RPC, but its client-linked session boundary must be reconciled.

The active TEST migration chain already contains forward definitions for the approved-membership staff helpers and public-only PT booking:
- `20261120124818_20261120180000_require_approved_membership_for_staff_helpers.sql`
- `20261120170230_limit_pt_bookings_to_public_slots.sql`

These are evidence of the target behavior in TEST, not a substitute for recovering Production's exact original migration lineage. A forward-only reconciliation must include these semantics and be rehearsed against the restored Production schema.

## Current Supabase advisors
Production security advisor:
- 4 authenticated SECURITY DEFINER function warnings (the four functions above).
- Leaked-password protection is disabled. This is a project Auth setting, not a SQL migration; enable and verify it through the project Auth security configuration before launch.

TEST security advisor:
- 25 authenticated SECURITY DEFINER function warnings, including the expected business RPCs and profile helper functions.
- Leaked-password protection is also disabled.
This shows the warning is broader than the four Production helpers. Do not blanket-revoke all SECURITY DEFINER functions. Classify each RPC by intended caller, input validation, row ownership, membership gate, search_path, and positive/negative authorization tests. Remove direct exposure only for internal functions that do not need to be callable through the Data API.

Performance advisor:
- Production reports unindexed foreign keys and per-row RLS function re-evaluation warnings, plus three multiple-permissive-policy warnings.
- TEST reports unused-index informational findings; no health advisor findings were returned.
Treat these as review items, not grounds for indiscriminate index or policy deletion. Any optimization must preserve the access predicates and be re-tested.

## Clean-start preflight semantics correction
The read-only readiness script is intended to run before the reset on a Production-derived restore. Its profile/Auth sections now explicitly report an `INVENTORY` of legacy profiles, users and identities, rather than marking pre-reset legacy state as if it were expected to satisfy the post-reset one-admin contract. The post-reset acceptance script remains the gate that requires exactly one new approved owner admin/Auth user/identity and zero operational rows.

## Verified CI status before this report
Commit `38f1f12edd6d24e8ef7380c7b563bb5c47484230` passed full clean local Supabase replay, exact 135-name catalogue assertion, schema/RPC/RLS contract, Auth signup gate and both read-only clean-start SQL executions. This confirms successful execution on a clean isolated baseline, not a Production restore or a completed post-reset rehearsal.

## Production state
No Production schema, data, Auth user, function, policy, migration ledger, project setting, Edge Function, or app deployment was changed by this audit. Production remains NO-GO until protected backup/restore, Production-derived forward-only reconciliation, clean-start rehearsal, catalogue sign-off, and security acceptance tests pass. Final Production GO LIVE still requires explicit owner authorization.
