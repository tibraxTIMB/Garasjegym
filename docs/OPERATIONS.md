# GarasjeGym – DRIFTSREGISTER / STAMMORDNUNG 49

Maintained operational index. Snapshot 2026-11-26; refresh after each release. Ancestry audit completed against 7eee80e3e775471fd51f7bb15cfaae51f4e502c4. This is a public repository: no account information, user records, backups, secrets or detailed security findings belong here.

## One production system
- App: https://tibraxtimb.github.io/Garasjegym/
- Werkstatt (approved role, PC width at least 1000px): https://tibraxtimb.github.io/Garasjegym/?office=1
- Production source: `garasjegym-2.0-sturm­kopf`, directory `v2/`. The branch contains a soft hyphen U+00AD; do not silently rename it.
- Last verified Pages deployment: [run 45900808469](https://github.com/tibraxTIMB/Garasjegym/actions/runs/45900808469), commit `bff5abf9fc34ead22142fca1adae1c1dd98769cf`. A documentation or source commit later than this is not automatically live. Confirm deployment success and `release-info.json`.
- Supabase: use only the production project reference already bound in the release workflow. The current dashboard display name is misleading (contains “test”); it is production. The original project is legacy. See [KLARHEIT](../v2/OPERATION_KLARHEIT.md). Do not rename, merge, reset, pause or delete projects without verifying the binding and backup. No new paid resources.
- Tablet Lab / browser audits use isolated synthetic data. No production test writes.
- Keep the unrelated game repository and database wholly separate.

## Workflows
1. New work: create a narrowly scoped candidate branch from current production, and a PR back to production. Use prefix `feature/`, `fix/` or `ops/` for new branches where supported; update workflow filters when needed.
2. Test candidate with existing regression, release artifact and browser checks. No destructive data changes. Schema changes require reviewed, versioned migration, clean local replay, backup and explicit approval.
3. Merge tested candidate after reviewing exact head and base. Normal pushes never publish. A release order changes **only** `.github/production-release.json` targeting the exact parent SHA. Existing build, browser audit, Tablet Lab, artifact checks and Pages environment must pass. No bypass.
4. Verify real Pages deploy, compare live release identity, record the run. If rollback is necessary, choose verified compatible release, preserve current production database and history.
5. Close superseded PRs and preserve their history. No branch deletion unless verified ancestor, no unique content, no open PR/automation dependency and recoverable reference. No deletion of backup/legacy/production branches merely for cosmetics.

## Branch register
Snapshot before documentation cleanup:

| Branch | Head (snapshot) | Classification |
|---|---|---|
| `audio-studio-ki-probe` | `667e3a5f7900` | DIVERGED – 6 unique commits, retain |
| `doppeladler-bibliothekar` | `c94469f335bd` | ACTIVE AUTOMATION – ancestor, retain |
| `flow-result-refinement` | `7763516d02bd` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `garasjegym-2.0-sturm­kopf` | `7eee80e3e775` | PRODUCTION |
| `gazelle-acta` | `f0d61aa1f615` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-alternative-audio` | `5e11651f4b8a` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-architect` | `4aad9392f6af` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-flow-compact` | `2b576fc80780` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-introkurs-integrity` | `54a449672081` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-librarium` | `4986faa06cc1` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-librarium-polish` | `ace1db004c41` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-operational-anatomical` | `c35d9cfc7efb` | DIVERGED – 40 unique commits, retain |
| `gazelle-plan-folders` | `9e7b4cb9fa7c` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-pt-compact` | `7ca7fd8845d5` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-pt-flow-integration` | `0ab23c55715c` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-pt-flow-repair` | `083cfc9ec06b` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-pt-flow-unlock` | `82fc03999968` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-pt-plan` | `09515100d199` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `gazelle-responsive-audit` | `a3fbd9336a15` | DIVERGED – 1 unique commits, retain |
| `hotfix-pt-dialog-layout-20261126` | `ea8f9e81a32a` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `klarheit-default-dispatch` | `75d9c6f2dfc8` | SUPERSEDED – unique legacy history, retain |
| `klarheit-release-order` | `d37e8303acb5` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `main` | `a3ddfa5bbac7` | LEGACY – default; unique history, retain |
| `operation-klarheit` | `41320f7f7e19` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `rollback-gazelle-20261126-3474dac` | `3474dac343ff` | ROLLBACK – ancestor, retain |
| `volksmaschine-reibungslos` | `9174a8425a4e` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |
| `werkstatt-pc-companion` | `e150643f44f8` | ARCHIVE CANDIDATE – verified ancestor (0 unique commits), retain until dependency check |

GitHub compare verified 21 ancestors, of which 19 are archive candidates and two are reserved for active automation/rollback; five diverged branches plus production. No branches deleted; confirm workflow and automation dependencies before deletion. Diverged means unique commits, not necessarily unique current content. The old PR #2 and optional default-branch dispatch PR #7 are superseded by the working KLARHEIT mechanism.

## Current backlog
- [EXPORTWERK 49 #11](https://github.com/tibraxTIMB/Garasjegym/issues/11) – separate candidate; do not include in prior published release.
- DOPPELADLER – retain active candidate and existing automation scope.
- Database maintenance: [migration lineage](MIGRATION_LINEAGE.md) records 10 exact source matches and one partial composite match. Advisor checks and function metadata inspected privately; role-behavior tests remain necessary. Evaluate indexes from workload (never blindly drop “unused” indexes).
- Infrastructure: consider renaming display labels only, after verifying actual project identity; consider branch protection only after confirming plan constraints and release-order compatibility. No change to production identity.
- Backup: dated offline DATABUNKER, verify restore locally. No dump in public GitHub. A backup is not verified until it can be restored; document actual backup result separately.

## Documentation hierarchy
1. This register: operational map and release inventory.
2. `v2/OPERATION_KLARHEIT.md`: environment and release contract.
3. `v2/README.md`: implementation and local developer commands.
4. `v2/OPERATION_MEISTERWERK.md`, `v2/WERKSTATT_PC_COMPANION.md`, `v2/WERKSTATT_TABLET_LAB.md`: module-specific design.
5. Other historical operation reports and migrations: historical evidence, not new instructions to deploy.

## Maintenance checkpoint – 2026-11-26

PR #12 merged after successful [installed-schema role and synthetic restore rehearsal](https://github.com/tibraxTIMB/Garasjegym/actions/runs/45902426913) and [build](https://github.com/tibraxTIMB/Garasjegym/actions/runs/45902434517). This is test infrastructure only, not a new app release. See [ORDRE006 rehearsal](ORDRE006_REHEARSAL.md). Actual owner's DATABUNKER restore remains unverified; project display-name change and branch deletion require tooling/owner-side access. No live database writes or deletion authorized by this checkpoint.
