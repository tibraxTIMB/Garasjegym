# GO LIVE Phase B60 – migration lineage recovery and privilege default ACL revalidation
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Branch:** `garasjegym-2.0-sturm­kopf`  
**Head before this document:** `9201dc98607c097bacdf25fe8990667f80848ce1`

## 1. New finding: a broad migration history exists, but exact production lineage is still not recovered
The active branch contains 164 SQL files under `v2/supabase/migrations/`. The branch history includes commit:
- `32db572e06120ca4dfc9b5c05f68e94308f7025b`
- Message: `chore: restore exact STURMKOPF migration history and reconcile schema drift`

Its tree includes 164 v2 migration files, including:
- a TEST baseline named `20261116225942_baseline_from_production_schema_no_data.sql`
- TEST-only seed and first-signup bootstrap files
- a long application and security migration series through `20261120205122_reconcile_membership_gate_and_exercise_metadata.sql`
- later `20261120230300_add_member_rank_to_profiles.sql`

This is useful source history, but it is not proof that the exact 11 production-applied migration bodies have been recovered. The active branch does not contain files with the exact production ledger versions/names below.

## 2. Production vs candidate source mapping
Production ledger (11 entries) was re-read directly:
1. `20261116213905_lock_down_manager_profile_updates`
2. `20261116214010_restrict_trigger_function_execution`
3. `20261116214020_restrict_anon_security_definer_rpc`
4. `20261117191749_workout_result_scoring_fields`
5. `20261117210956_align_workout_log_result_data`
6. `20261118184920_wod_timer_settings_and_exercise_metadata`
7. `20261118194052_exercise_prescription_profiles`
8. `20261119223903_revoke_anon_security_definer_execute`
9. `20261119224030_harden_production_security_definer_paths`
10. `20261120214242_secure_pt_session_capacity`
11. `20261120214355_revoke_anon_public_table_access`

Potential related TEST branch files:
- `20261116230042_restrict_trigger_rpc.sql` – related trigger-only function EXECUTE revokes.
- `20261116230023_harden_rpc_grants.sql` – related SECURITY DEFINER RPC grants for authenticated helpers.
- `20261117203914_add_workout_log_score_fields.sql` – matching score-field intent, different migration version.
- `20261117210959_align_workout_log_result_data.sql` – matching result_data column intent, different migration version.
- `20261116230008_wod_timer_settings.sql` – WOD timer settings.
- `20261117100953_expand_exercise_library_metadata.sql` – exercise metadata.
- `20261118194828_exercise_prescription_profiles.sql` – prescription profile column, different migration version.
- `20261119202903_harden_security_definer_search_paths.sql` – security-definer search_path hardening.
- `20261120110502_secure_pt_session_capacity.sql` – private capacity helper and security-invoker view.
- `20261120091100_revoke_anon_public_table_access.sql` – broad anon public-table/sequence revocation.

The first production manager-profile restriction and the later production-specific anon SECURITY DEFINER revoke are not established as exact matches by the available filenames. Similar intent is not sufficient proof of identical SQL.

## 3. Important test-source warning
The candidate files above are in a TEST migration history with timestamps that differ from production. They must not be copied into production or replayed against production merely because the names look similar.
The active branch also contains explicit TEST-only files:
- `20261116230108_test_seed_data.sql`
- `20261117090304_test_first_signup_admin_bootstrap.sql`
and a baseline explicitly named `baseline_from_production_schema_no_data`. These remain prohibited for production replay.

The production ledger has 11 entries; TEST ledger has 164. This is not a simple list of 153 pending production migrations. The project schemas differ materially (18 production public tables vs 46 TEST public tables). Migration source recovery and a production-safe release manifest remain separate tasks.

## 4. Default ACL revalidation (read-only)
A direct query of `pg_default_acl` on production confirms:
- For objects created by `postgres` in `public`, default table ACL grants `arwdDxtm` to `authenticated` (and service_role).
- For objects created by `supabase_admin` in `public`, default table ACL includes `arwdDxtm` for both `anon` and `authenticated`.
- Function default ACLs for both roles include EXECUTE for anon and authenticated.
- Similar defaults also appear in platform schemas (storage/graphql/realtime/auth), which are outside the scope of application-schema remediation.

The privilege letters `arwdDxtm` represent INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER. Default ACLs apply to future objects created by the named owner role. Do not blanket alter platform-owned defaults or system schemas. The exact origin/necessity of public defaults must be resolved with Supabase platform documentation and owner-role creation history before changes.

## 5. Current technical disposition
- No production SQL was executed except read-only catalog inspection.
- No GRANT/REVOKE, ALTER DEFAULT PRIVILEGES, migration application, data reset, Auth deletion or deployment occurred.
- No original production migration body is yet certified as recovered.
- Candidate test SQL has been read for intent only; no source was promoted or applied.
- Exact app call-site dependency review for authenticated TRUNCATE/TRIGGER/REFERENCES remains open.
- Production privilege remediation remains design-only (see B58).

## 6. Next actions
1. Recover exact original SQL for each production ledger version from trusted Git history, database migration artifacts, or owner-held backups. Record source commit/blob SHA for each.
2. For any migration whose original body cannot be recovered, create a separately named, clearly labelled live-catalog reconciliation baseline/candidate, not a fabricated historical migration.
3. Review every candidate diff against the live production catalog and test it on an isolated restored production clone.
4. Trace application code and Edge Functions for required grants; remove only demonstrably unnecessary table privileges, including TRUNCATE/TRIGGER/REFERENCES, with tests.
5. Resolve owner-specific default ACLs without altering platform-managed defaults.
6. Keep schema drift, backup/restore rehearsal, first-admin bootstrap, CI/artifact provenance, branch integration and production deploy isolation as independent release gates.

**B60 result:** More source history and close candidate migration bodies have been located. Exact production migration lineage is not yet proven. No production changes were made. Production remains NO-GO.
