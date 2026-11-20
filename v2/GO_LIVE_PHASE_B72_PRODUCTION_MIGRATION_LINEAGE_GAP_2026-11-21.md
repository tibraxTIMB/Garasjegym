# B72 – Production migration ledger lineage gap
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Repository: tibraxTIMB/Garasjegym
Branch: garasjegym-2.0-sturm­kopf
Production Supabase: kultdmklwmilhoytrrig
TEST Supabase: izwzwvlexqxqewzijhhd

## Read-only ledger comparison
Production `supabase_migrations.schema_migrations`: 11 entries.
TEST `supabase_migrations.schema_migrations`: 164 entries.
Repository `v2/supabase/migrations/`: 164 SQL files.
The 164 TEST ledger versions correspond to the 164 versioned migration files in the active v2 migration directory.
None of the 11 production ledger version identifiers is present as a filename version in the current v2 migration directory.

### Production ledger entries not found by exact version in v2 migration sources
| Production version | Recorded name |
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

## Consequence
The active repository's migration directory is not a complete, exact replay history for the live Production ledger. Similar migration names or matching intent are not proof that the original SQL, ordering, preconditions, grants, or side effects are identical. The 11 production SQL definitions must be recovered from trusted historical commits, backups, or Supabase migration artifacts and checked against live schema before a forward-only migration plan can be certified.

The TEST baseline migration `20261116225942_baseline_from_production_schema_no_data.sql` and TEST bootstrap/seed migrations are not a substitute for these missing production migrations and must not be replayed into Production.

## Safe next actions
1. Search repository history for the exact original production SQL files and compare their blob hashes/content to the recorded migration intent.
2. If any SQL cannot be recovered exactly, mark that migration as unrecovered and reconstruct only from verified live catalog state plus independent evidence, with explicit review.
3. Produce a migration lineage map showing each live production ledger entry, its original source, its catalog effects, and whether the current v2 target includes or supersedes it.
4. Do not alter the production migration ledger manually. Do not baseline, repair, or replay production migrations until lineage is reconciled and a full restore rehearsal is complete.

## Actions not performed
No migration, schema, data, ledger, RLS, grant, Auth, Storage, Edge Function, or production deployment changes were made.

Status: migration lineage is an independent hard blocker; Production release remains NO-GO.
