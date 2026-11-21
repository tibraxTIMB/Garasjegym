# B77 – GO LIVE decision and Production migration-lineage check
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch: `garasjegym-2.0-sturm­kopf`
Previous reviewed commit: `6461fc057bb96c93c9e61e43fef5d9b28421605a`

## Owner request
The owner explicitly requested GO LIVE again. The Production boundary was rechecked before any release action.

## Production migration lineage – blocking result
Read the live Production migration ledger directly from `supabase_migrations.schema_migrations`. It contains these 11 versions:

| Version | Ledger name |
|---|---|
| 20261116213905 | lock_down_manager_profile_updates |
| 20261116214010 | restrict_trigger_function_execution |
| 20261116214020 | restrict_anon_security_definer_rpc |
| 20261117191749 | workout_result_scoring_fields |
| 20261117210956 | align_workout_log_result_data |
| 20261118184920 | wod_timer_settings_and_exercise_metadata |
| 20261118194052 | exercise_prescription_profiles |
| 20261119223903 | revoke_anon_security_definer_execute |
| 20261119224030 | harden_production_security_definer_paths |
| 20261120214242 | secure_pt_session_capacity |
| 20261120214355 | revoke_anon_public_table_access |

Compared the exact 11 version IDs against every active SQL migration filename in `v2/supabase/migrations/`: **0 of 11 exact source migration files are present**.

This means the current repository does not provide the authoritative original SQL for the live Production migration history. The ledger labels alone do not prove the exact SQL or resulting object state. Replaying the current 167-file v2 migration chain against this already-initialized Production project, or fabricating replacement history entries, is not safe.

## Combined live schema gate
The read-only production schema inventory remains:
- 18 of 46 expected public tables present; 28 missing.
- 173 Production columns versus 509 TEST columns; 336 TEST-side columns absent from Production.
- 3 missing membership/profile columns: `email`, `membership_status`, `member_rank`.
- 0 of the 26 required application RPCs found.
- 0 Production public tables with RLS disabled.
- 2 shared-column definition differences remain documented in B76.

The production-target frontend artifact builds successfully, but this does not make the database compatible.

## Release decision
**NO-GO – no Production deployment, no Production migration, no clean-start reset.**

No Production DDL/DML, Auth changes, migration ledger changes, Edge Function changes, RLS policy changes, grants, data deletion, or deployment have been performed.

## Required next evidence
1. Recover the exact original SQL and checksums for all 11 Production ledger versions from the historical deployment source or a trusted Production backup. Do not infer SQL from the migration names.
2. Obtain an encrypted, Auth-preserving Production backup and demonstrate restore into an isolated project, including user identities and owner-admin sign-in.
3. Use that restored database to rehearse a reviewed forward-only additive migration plan from the actual live schema to the v2 contract. Validate constraints, indexes, triggers, functions, grants, RLS and every app RPC.
4. Verify Edge Function dependencies and secrets on the restored candidate.
5. Only after those checks pass, perform the owner-approved Production migration, clean-start reset and deployment as separate audited steps.

The Production database is preserved unchanged.
