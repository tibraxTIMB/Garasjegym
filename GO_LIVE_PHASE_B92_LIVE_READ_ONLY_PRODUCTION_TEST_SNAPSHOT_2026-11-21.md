# B92 – Live read-only Production/TEST readiness snapshot
Date: 2026-11-21
Release: SturmKopf Feuer 1.1

## Direct read-only Supabase inspection
The following figures were read from both hosted projects using a single aggregate read-only SQL query per project. They are a point-in-time snapshot, not a backup or proof of data restoration.

| Metric | Production | TEST |
|---|---:|---:|
| Public application tables | 18 | 46 |
| Public tables without RLS | 0 | 0 |
| Public RLS policies | 49 | 144 |
| Public functions | 8 | 75 |
| SECURITY DEFINER public functions | 7 | 49 |
| Auth users | 3 | 4 |
| Auth identities | 3 | 4 |
| Auth sessions | 12 | 10 |
| Auth refresh tokens | 12 | 36 |
| Auth MFA factors | 0 | 0 |
| Auth MFA challenges | 0 | 0 |
| Public profiles | 3 | 4 |
| Standard system exercises | 56 | 94 |
| Custom exercises | 0 | 0 |
| Storage objects | 0 | 0 |
| Migration ledger entries | 11 | 164 |

**Important:** Neither hosted project has been reset. The 135-name reconciled catalogue and single-owner clean-start acceptance are proven in the disposable local Supabase rehearsal, not in either hosted project. The 135-name manifest is still provisional pending semantic alias/category review.

## Interpreting the differences
- The current Production schema is not a complete SturmKopf 2.0 backend: 28 of 46 application tables are absent and the function/policy inventories differ significantly.
- Zero tables without RLS is necessary but insufficient. Production RLS privacy tests previously failed all eight release contract assertions.
- Production currently contains 3 Auth identities/profiles and live Auth sessions/tokens. The clean-start target requires one **new** owner-controlled Auth identity/profile and no legacy sessions/tokens at the pre-login acceptance point. Do not carry the three existing identities into the clean-start launch.
- Both hosted projects currently have zero Storage objects, so there is no live Storage-object deletion to plan from this snapshot. Recheck immediately before any actual reset.
- The Production ledger contains 11 historical entries with no exact matching original SQL in the accessible repository branches/releases. Do not edit or fake the ledger.
- TEST has 164 migration ledger entries. That number is not itself a migration plan for Production; forward-only reconciliation must be derived from a verified Production restore.
- Protected owner-run Production backup, Auth-complete isolated restore, rollback login, and post-restore rehearsal remain blocking.

## Next non-destructive work
1. Run the owner-controlled zero-cost backup steps from `v2/GO_LIVE_OWNER_BACKUP_RESTORE_AND_ADMIN_CHECKLIST.md`. Do not paste credentials or backups into ChatGPT/GitHub.
2. Restore into an isolated disposable environment and prove legacy owner login and rollback.
3. Compare restored Production schema, grants, Auth and RLS against the local passing release contract; prepare forward-only reconciliation without rewriting the historical ledger.
4. Rehearse the clean start and invite-only new-owner flow on the isolated restore, then re-run acceptance and privacy tests.
5. Only after all release gates pass, obtain a separate explicit final Production GO LIVE authorization.

No Production or TEST write was performed in this snapshot. Production remains NO-GO.
