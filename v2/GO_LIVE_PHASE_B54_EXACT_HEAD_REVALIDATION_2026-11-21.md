# GO LIVE Phase B54 – exact-head revalidation and non-interference snapshot

**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Working branch:** `garasjegym-2.0-sturm­kopf`  
**Exact head checked:** `242d90db8f60437a9735d37194972f7ab7fe98d4`  
**Decision:** CONTINUE HOLD – NO PR/MERGE/DEPLOY

## 1. Exact-head GitHub checks

The latest branch head resolves to commit `242d90db8f60437a9735d37194972f7ab7fe98d4`.

- Combined commit status endpoint returned an empty `statuses` array. This is **not** evidence of a green build.
- The available commit workflow-run wrapper returned no runs because it only lists pull-request-triggered workflow runs; it cannot verify push-triggered runs.
- Therefore CI for this exact head is **unverified**. Historical B49–B52 successful runs apply only to their recorded earlier commits.
- GitHub compare against `main` still reports `diverged`: 1,813 commits ahead, 30 behind; merge base `dbfa81c8e2b24a265e2a3acaedba714aaeda2dd8`.
- No PR, merge, rebase or force-push was performed.

## 2. CI workflow consolidation

The redundant custom workflow was removed. Existing workflows remain the intended automated checks:
- `.github/workflows/garasjegym-v2.yml`: aggregate tests, SQL migration syntax checks, PostgreSQL 17 candidate rehearsal on qualifying push messages, isolated TEST build and artifact check.
- `.github/workflows/sturmkopf-verify.yml`: focused app tests, migration check, isolated TEST build and artifact check.
- `.github/workflows/deploy-sturmkopf-pages.yml`: build-only on push; shared Pages publication requires manual `workflow_dispatch` with `publish_preview=true`.

The three new production-migration checker unit tests remain included in `npm test`. The standalone production migration checker must not be treated as passed: the production migration source path has not yet been separated from the mixed TEST migration history.

## 3. Fresh production/TEST non-interference snapshot

Read-only live SQL checks returned:

| Check | Production | TEST |
|---|---:|---:|
| Public base tables | 18 | 46 |
| `profiles.member_rank` column exists | No | Yes |
| Registered migrations | 11 | 164 |

Production `profiles.membership_status` also remains absent. The TEST ledger ends with `reconcile_untracked_schema_objects`, `reconcile_membership_gate_and_exercise_metadata`, and `add_member_rank_to_profiles`. Production's 11 installed migration versions are unchanged from the earlier capture.

This confirms the `member_rank` change is isolated to TEST. No production SQL write was made.

## 4. Fresh security advisor state

- Production: 4 authenticated-executable SECURITY DEFINER warnings and 1 leaked-password-protection warning.
- TEST: 25 authenticated-executable SECURITY DEFINER warnings and 1 leaked-password-protection warning.

These are advisor findings, not proof that every RPC is exploitable. The functions need role-by-role authorization tests and intentional grants review. No broad EXECUTE revocation or Auth setting change was made. Production leaked-password protection remains disabled and requires owner-approved Auth configuration change.

A follow-up search of GitHub commit messages for each of the 11 installed production migration identifiers returned no matching commits. The current repository therefore provides no recoverable original migration source via either file search or commit-message search. This does not prove no external backup or historic repository contains them; it confirms they cannot currently be recovered from the connected repository search.

## 5. Current release blockers

1. Wave 0 encrypted backup, supported Auth recovery and isolated Supabase restore remain unverified.
2. Original source SQL for all 11 production-installed migration versions is absent from the current repository migration directories.
3. Production schema still lacks 28 TEST feature tables and 35 shared-table columns; complete object-level reconciliation is still required.
4. No reproducible npm lockfile exists.
5. Exact-head CI is unverified; the available status result is empty, not green.
6. The branch is materially diverged from `main` and requires a controlled integration plan.
7. Auth security warnings and leaked-password protection require closure/owner decision.
8. No final role-by-role app regression on a production-derived Supabase restore has been demonstrated.

## 6. Execution boundary

This phase used read-only GitHub metadata and read-only SQL/catalog queries. No production or TEST schema/data/Auth changes, no backup exports, no secrets access, no Pages publication, no PR, no merge and no deployment occurred.

**B54 result:** The TEST-only `member_rank` change remains isolated and production remains unchanged. Exact-head CI is unverified, branch integration remains unsafe, and Wave 0 is not passed. **NO-GO remains in force.**


## 7. Additional release-path finding

The current Pages workflow builds with the TEST Supabase URL and TEST publishable key. Its manual `publish_preview=true` gate publishes that TEST-connected bundle to the shared GitHub Pages address; it is not a production deployment. It must not be described or used as production GO LIVE.

The release artifact checker explicitly rejects the production project reference and accepts only the TEST project reference. This is a useful non-interference guard for previews, but it also means the current artifact pipeline cannot produce a production-connected release artifact. A separate, reviewed production build/deployment path is required, with production configuration supplied only through protected environment secrets and a distinct approval gate.

The established CI workflows run `npm run check:migrations` and `npm test`. The new production migration preflight is represented by unit tests inside `npm test`, but `npm run check:production-migrations` is not run as a CI step. Its live-folder check is expected to fail until TEST-only migration files are moved into a separate TEST migration path. Thus a green existing CI run would not, by itself, prove production migration readiness.
