# B82 – Production migration-ledger lineage gap
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Production project: kultdmklwmilhoytrrig
Branch: garasjegym-2.0-sturm­kopf

## Read-only result
Live Production reports 11 migration ledger entries. The active branch migration directory does not contain the exact timestamped SQL file for any of those 11 versions.

Four matching descriptive suffixes exist in the branch under different timestamps:
- align_workout_log_result_data: Production ledger 20261117210956; branch file 20261117210959_align_workout_log_result_data.sql.
- exercise_prescription_profiles: Production ledger 20261118194052; branch file 20261118194828_exercise_prescription_profiles.sql.
- secure_pt_session_capacity: Production ledger 20261120214242; branch file 20261120110502_secure_pt_session_capacity.sql.
- revoke_anon_public_table_access: Production ledger 20261120214355; branch file 20261120091100_revoke_anon_public_table_access.sql.

The remaining seven Production ledger names do not have an exact same-named SQL file in the active branch migration directory. Related behaviour may have been superseded or consolidated by later migrations, but a filename similarity or current schema state does not prove historical SQL equivalence.

## Consequence
Do not replay the active branch's 164 SQL files directly against Production. Do not mark the 11 ledger entries as reconciled. Applying migrations based only on the current schema diff could duplicate, conflict with or silently bypass earlier production changes.

## Free recovery path
1. Use the owner-run, protected logical backup described in B81 and preserve the live migration ledger output.
2. Capture the full live schema/security catalogue with production_catalog_capture_read_only.sql.
3. Search the GitHub repository history, release artifacts and local owner working copies for the original 11 SQL files. Preserve exact content and hashes; do not regenerate them from names alone.
4. If an original SQL file cannot be recovered, document it as unrecoverable and derive a new forward-only migration from the verified live schema to the desired tested contract. Do not pretend this reconstructs the historical migration.
5. Test the resulting migration set against a local PostgreSQL 17/Supabase restore from the owner's backup, not against Production.

## Safety
This was a repository-tree and read-only migration-ledger comparison. No production schema, data, Auth, policies, grants or deployment was changed.