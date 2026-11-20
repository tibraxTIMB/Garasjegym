# GO LIVE Phase B55 – migration ledger and exact release boundary revalidation

**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Working branch:** `garasjegym-2.0-sturm­kopf`  
**Verified candidate commit:** `0d8760a86643600f231d4ba51c85c0b18d13a99d`  
**Decision:** NO-GO – ledger lineage, Wave 0 recovery, CI proof and integration remain unresolved

## 1. Exact branch comparison

GitHub compare of `main` against the verified candidate commit reports:
- Status: `diverged`
- Candidate ahead: 1,816 commits
- Candidate behind: 30 commits
- Merge base: `dbfa81c8e2b24a265e2a3acaedba714aaeda2dd8`
- Main base SHA at check: `702c7fe2da2a1106d7c70f0375fd5913fc78b4b0`

No merge, rebase, PR creation or production operation was performed. This is not a safe integration state to resolve by blindly merging.

## 2. Live migration ledger recheck

Read-only Supabase migration ledger calls returned:
- Production `kultdmklwmilhoytrrig`: 11 registered migrations.
- TEST `izwzwvlexqxqewzijhhd`: 164 registered migrations.

The TEST ledger includes the TEST-only `baseline_from_production_schema_no_data` and `test_seed_data`, plus `test_first_signup_admin_bootstrap`. Its latest registered migration is `20261120230300_add_member_rank_to_profiles`. Production does not have the corresponding `member_rank` column according to the prior live catalog check.

The eleven production migration identifiers remain without recovered source SQL in the working migration directories. The TEST ledger is not a substitute for those files. No migration was applied by this phase.

## 3. Release artifact / Pages boundary confirmed

The current Pages workflow builds with the TEST Supabase URL and publishable key. Its optional manual publication would replace the shared Pages content with a TEST-connected bundle, not a production-connected app.

The release artifact checker currently requires the TEST project reference and rejects the production project reference. This is appropriate as a preview non-interference guard, but does not produce a valid production artifact. A separate production build and deployment path is required, with production configuration supplied through protected environment configuration and a separate approval gate.

The current workflows run `npm run check:migrations` and `npm test`; they do not run `npm run check:production-migrations` as a separate workflow step. Existing CI, even if green, is not sufficient evidence of production migration readiness.

## 4. Outstanding release gates

1. Owner-run encrypted backup, supported Auth/identity recovery and isolated restore acceptance remain incomplete.
2. Original SQL for the eleven production ledger entries remains unrecovered; do not invent or replay TEST migrations.
3. Production-specific forward-only migration sequence and disposable restore rehearsal remain incomplete.
4. Security Advisor warnings require function-by-function grant and role testing; leaked-password protection remains disabled pending owner configuration.
5. Exact candidate CI run/build artifact status is not proven green by the currently available status/run wrappers.
6. Branch remains 1,816 ahead and 30 behind `main`; integration requires a deliberate review of the divergent history and path conflicts.
7. A production-specific build/deploy workflow does not yet exist.

## 5. Non-interference result

This phase performed read-only migration ledger and GitHub comparison checks and updated this report. No production database writes, Auth setting changes, Edge Function changes, deployment, Pages publication, merge, rebase, paid resource creation, or backup/restore operation occurred.

**B55 result:** Migration ledger counts and release boundaries are reconfirmed. Production remains **NO-GO** until the gates above are independently passed.


## 6. Fresh Supabase Advisor recheck

Read-only advisor calls on both projects returned:
- Production security: 4 authenticated-executable SECURITY DEFINER warnings (`book_pt_session`, `is_active_user`, `is_admin`, `is_admin_or_manager`) and 1 leaked-password-protection-disabled warning.
- TEST security: 25 authenticated-executable SECURITY DEFINER warnings and 1 leaked-password-protection-disabled warning.
- Production health: no lints.
- TEST health: no lints.

These are advisor findings, not proof that every listed RPC is exploitable. They require per-function grant, caller-role and data-scope review. Do not blanket-revoke helper execution: RLS policies and other RPCs may depend on those helpers. No grants or Auth settings were changed in this recheck.
