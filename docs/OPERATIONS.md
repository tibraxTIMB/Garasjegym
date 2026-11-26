# GarasjeGym – DRIFTSREGISTER / STAMMORDNUNG 49

Maintained operational index. Snapshot 2026-11-26; refresh after each release. This is a public repository: no account information, user records, backups, secrets or detailed security findings belong here.

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
| `audio-studio-ki-probe` | `667e3a5f7900` | HOLD – verify ancestry and unique changes before archive |
| `doppeladler-bibliothekar` | `c94469f335bd` | ACTIVE CANDIDATE – do not delete |
| `flow-result-refinement` | `7763516d02bd` | HOLD – verify ancestry and unique changes before archive |
| `garasjegym-2.0-sturm­kopf` | `bff5abf9fc34` | PRODUCTION |
| `gazelle-acta` | `f0d61aa1f615` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-alternative-audio` | `5e11651f4b8a` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-architect` | `4aad9392f6af` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-flow-compact` | `2b576fc80780` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-introkurs-integrity` | `54a449672081` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-librarium` | `4986faa06cc1` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-librarium-polish` | `ace1db004c41` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-operational-anatomical` | `c35d9cfc7efb` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-plan-folders` | `9e7b4cb9fa7c` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-pt-compact` | `7ca7fd8845d5` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-pt-flow-integration` | `0ab23c55715c` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-pt-flow-repair` | `083cfc9ec06b` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-pt-flow-unlock` | `82fc03999968` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-pt-plan` | `09515100d199` | HOLD – verify ancestry and unique changes before archive |
| `gazelle-responsive-audit` | `a3fbd9336a15` | HOLD – verify ancestry and unique changes before archive |
| `hotfix-pt-dialog-layout-20261126` | `ea8f9e81a32a` | MERGED – retain history |
| `klarheit-default-dispatch` | `75d9c6f2dfc8` | SUPERSEDED – retain reference |
| `klarheit-release-order` | `d37e8303acb5` | MERGED – retain history |
| `main` | `326f73f18289` | LEGACY – default, no releases |
| `operation-klarheit` | `41320f7f7e19` | MERGED – retain history |
| `rollback-gazelle-20261126-3474dac` | `3474dac343ff` | ROLLBACK – retain |
| `volksmaschine-reibungslos` | `9174a8425a4e` | HOLD – verify ancestry and unique changes before archive |
| `werkstatt-pc-companion` | `e150643f44f8` | MERGED – retain history |

MERGED denotes confirmed integrated PR work, not permission to delete. HOLD entries are not verified as redundant; keep them. The old PR #2 and optional default-branch dispatch PR #7 are superseded by the working KLARHEIT mechanism.

## Current backlog
- [EXPORTWERK 49 #11](https://github.com/tibraxTIMB/Garasjegym/issues/11) – separate candidate; do not include in prior published release.
- DOPPELADLER – retain active candidate and existing automation scope.
- Database maintenance: review advisor findings privately, confirm RPC authorization and RLS through tests, reconcile applied migration history against checked-in provenance, evaluate indexes from workload (never blindly drop “unused” indexes).
- Infrastructure: consider renaming display labels only, after verifying actual project identity; consider branch protection only after confirming plan constraints and release-order compatibility. No change to production identity.
- Backup: dated offline DATABUNKER, verify restore locally. No dump in public GitHub. A backup is not verified until it can be restored; document actual backup result separately.

## Documentation hierarchy
1. This register: operational map and release inventory.
2. `v2/OPERATION_KLARHEIT.md`: environment and release contract.
3. `v2/README.md`: implementation and local developer commands.
4. `v2/OPERATION_MEISTERWERK.md`, `v2/WERKSTATT_PC_COMPANION.md`, `v2/WERKSTATT_TABLET_LAB.md`: module-specific design.
5. Other historical operation reports and migrations: historical evidence, not new instructions to deploy.
