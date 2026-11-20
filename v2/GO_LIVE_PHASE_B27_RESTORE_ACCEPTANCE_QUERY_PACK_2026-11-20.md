# GO LIVE Phase B27 – isolated restore rehearsal acceptance queries

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Decision:** READ-ONLY RESTORE ACCEPTANCE PACK PREPARED AND SYNTAX-TESTED

## 1. Rehearsal query pack

Added `v2/supabase/preflight/restore_rehearsal_read_only.sql`. It is explicitly SELECT-only and intended to be run against a disposable restored target after the owner completes the encrypted export/restore process.

The query returns aggregate-only results for:
- Core application table counts, Auth users/identities/sessions and Storage buckets/objects.
- Profiles without Auth users and Auth users without profiles.
- Personal-record linkage, including standalone PRs.
- Invalid profile roles.
- Public base tables with RLS disabled.
- Public SECURITY DEFINER functions lacking an explicit search_path setting.
- Required membership, class-booking and workout schema-contract columns.

It does not retrieve names, emails, IDs, notes, password hashes, tokens, or object paths, and it does not modify data or schema.

## 2. Syntax and behavior validation

Executed the exact query against the isolated TEST project `izwzwvlexqxqewzijhhd`. It completed successfully and returned all expected result categories, including schema contract, Auth/profile linkage, RLS and function search-path checks.

This was a query syntax/behavior test only. The TEST project contains its own demo data and is not a production restore target. Its row counts are not production evidence and must not be compared as though it were a restored snapshot.

## 3. How to use after backup

After the owner has created encrypted database/Auth exports, verified checksums and restored into a disposable isolated environment:
1. Run this SELECT-only pack against the restored target.
2. Compare aggregate counts with the exact source backup timestamp, not a later or earlier snapshot.
3. Investigate any missing schema-contract columns, orphaned Auth/profile relationships, disabled RLS or missing function search_path settings.
4. Confirm standalone personal records remain unattached where they were standalone in the source snapshot.
5. Complete app smoke tests with isolated credentials and confirm the restore target contains no production-to-test credential crossover.

The query pack does not itself prove a restore; only a completed restore and successful app/database validation can pass Wave 0.

## 4. Execution boundary

One read-only query was executed against TEST to validate the acceptance pack. No production query, DDL, DML, export, restore, Auth/Storage operation, Edge Function change, deployment or paid resource was performed.

**B27 result:** Restore acceptance queries are prepared and syntax-tested on TEST. Wave 0 remains NOT PASSED until the owner performs and validates the actual isolated restore. Production remains **NO-GO**.
