# GO LIVE Phase B53 – release branch integration and CI gate revalidation

**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Decision:** BRANCH ISOLATED; NO PR/MERGE; PRODUCTION NO-GO

## 1. Branch comparison

GitHub compare was run against the repository default branch:

- Base: `main` at `702c7fe2da2a1106d7c70f0375fd5913fc78b4b0`
- Head: `garasjegym-2.0-sturm­kopf`
- Compare status: `diverged`
- GitHub reports head 1,809 commits ahead and 30 commits behind the base.
- Merge base: `dbfa81c8e2b24a265e2a3acaedba714aaeda2dd8`

This is not a small, clean release PR. The compare includes the full v2 app, numerous migrations and release documents, plus existing workflow files. No pull request was opened and no merge/rebase was attempted. The branch must remain isolated until its history and intended full release diff have been reviewed. Do not merge this branch based only on the latest small commits.

## 2. Existing deployment workflow inspection

The following workflows were read from the working branch:

- `.github/workflows/deploy-sturmkopf-pages.yml`
  - Push to the STURMKOPF branch builds a preview artifact using the isolated TEST Supabase URL.
  - The Pages deploy job is explicitly gated to a manual `workflow_dispatch` with `publish_preview=true`.
  - Ordinary push does not publish to the shared Pages URL.
- `.github/workflows/garasjegym-v2.yml`
  - Runs app tests and builds against the isolated TEST project.
  - Its disposable PostgreSQL 17 rehearsal is separately gated by a go-live/Wave 1 commit message.
- `.github/workflows/sturmkopf-verify.yml`
  - Runs focused tests and builds against the isolated TEST project.

No manual Pages publication was requested or initiated. No production URL/key was inserted into a workflow.

## 3. Additional CI gate

Added `.github/workflows/sturm-kopf-ci.yml`:
- App validation job: install, aggregate tests, SQL migration checks, build against TEST Supabase configuration, release artifact scan.
- Separate production migration safety job: fails if test-only SQL remains in the production migration directory.

The workflow file is committed, but a successful run for the latest working commit has not been verified. Existing B49–B52 CI success is historical evidence for earlier pinned commits only; it must not be carried forward as proof for the current head.

The repository has no npm lockfile at root or under `v2/`. CI uses `npm install` as a temporary route, not `npm ci`. Dependency resolution is therefore not reproducible yet. A reviewed lockfile is required before release sign-off.

The three new production-migration preflight tests were executed locally in an isolated Node.js fixture using the committed test and guard source: 3 passed, 0 failed. This does not prove the complete app test suite or Vite build.

## 4. Migration source provenance recheck

Searched the repository for all 11 migration versions currently installed in production. No source-file matches were found. This confirms the B30 provenance gap remains open.

The current v2 migration directory includes:
- A TEST-only schema baseline.
- TEST demo seed data.
- TEST first-signup admin bootstrap.
- Feature migrations that are not installed in production and depend on earlier v2 objects.

The new production preflight intentionally blocks the three known TEST-only migrations. Do not make it pass by weakening the guard. First create a separately controlled TEST migration path/configuration and ensure the test project's migration workflow remains intact.

## 5. Execution boundary

- No production SQL writes, DDL, DML, Auth configuration changes or deployment.
- No TEST data/schema/Auth changes in this phase except the previously recorded isolated `member_rank` test migration.
- No Pages publication, merge, PR or branch rebase.
- No credentials or secret values read or committed.

## 6. Remaining hard gates

1. Recover or formally reconstruct and review the 11 production migration sources.
2. Split TEST-only baseline/seed/bootstrap from the production release migration path without breaking TEST migration management.
3. Add and commit a reviewed npm lockfile.
4. Verify latest-head GitHub Actions success for the exact release candidate.
5. Resolve the branch's 1,809-ahead/30-behind divergence before proposing a merge.
6. Complete owner-run encrypted backup and actual isolated Supabase Auth/data restore rehearsal.
7. Reconcile all 28 missing tables, 35 shared-table columns and the full object-level drift from B30 against the live production schema.
8. Obtain explicit owner GO LIVE approval for the exact reviewed migration/build hashes.

**B53 result:** Existing preview workflow is guarded against automatic publication, and new CI/migration safety checks are committed. Branch integration, migration provenance, reproducible dependencies, backup/restore and latest-head CI remain blockers. Production remains **NO-GO**.


## 7. CI workflow consolidation – 2026-11-21

A follow-up review found that the additional `.github/workflows/sturm-kopf-ci.yml` duplicated the established `garasjegym-v2.yml` and `sturmkopf-verify.yml` workflows. Its production migration job would also fail against the intentionally mixed TEST migration directory. To avoid duplicate CI runs and a misleading permanently-red workflow, the redundant workflow was removed from the isolated branch.

The production migration checker and its three unit tests remain in the codebase, and the tests remain part of `npm test`. The checker is a deliberate manual release gate until a separate, provenance-reviewed production migration directory exists. Existing CI workflows already run the aggregate app tests, migration checks, PostgreSQL 17 rehearsal and isolated TEST build on branch pushes.

No existing workflow was weakened, no production deployment workflow was changed, and no workflow was manually dispatched. The next exact-head CI status must be checked from GitHub Actions before release acceptance.
