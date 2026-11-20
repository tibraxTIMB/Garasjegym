# Migration inventory reconciliation – 2026-11-20

**Scope:** `v2/supabase/migrations` on `garasjegym-2.0-sturm­kopf`, compared by migration version to the live Supabase migration ledgers.

## Result

| Check | Result |
|---|---:|
| SQL migration files in `v2/supabase/migrations` | 163 |
| Installed migrations in test project | 163 |
| Test migration versions without a matching SQL file | 0 |
| Repository V2 SQL migration files absent from test ledger | 0 |
| Installed production migrations | 11 |
| Production versions represented in the V2 migration directory | 0 |

The V2 test migration history is now fully represented by the current branch SQL files by version. This supersedes older QA notes that reported 15 installed migrations without matching files and four repository files absent from the test migration ledger. Those older statements are stale for the current branch state.

The production migration history is intentionally different from the test history. The 11 production migration versions do not occur in `v2/supabase/migrations`. The root-level legacy `supabase/migrations` directory is a separate 15-file set and is not the V2 migration directory. Do not mix the root legacy migrations with the V2 test migration history or assume either is a production-forward migration sequence.

## Release implications

1. The test database can now be reproduced from the V2 migration directory by version ordering, subject to confirming all required external prerequisites and environment settings.
2. This does **not** make the test history safe to replay against production. The test history contains a test-only baseline and test seed migration, and production has a separate 11-version history.
3. The original SQL source for the 11 production-applied versions must be located/archived or reconstructed from the live production definitions and commit history before final approval.
4. The production release sequence must be a new reviewed forward-only sequence derived from a production schema capture. It must preserve existing rows and production-only behavior.
5. The two production-only hardening migrations applied on 2026-11-20 must remain represented in the final release history and must not be replayed blindly.

## Verified source state

- Branch: `garasjegym-2.0-sturm­kopf`
- Test project: `izwzwvlexqxqewzijhhd`
- Production project: `kultdmklwmilhoytrrig`
- V2 migration file count and installed test migration count were read directly during this check.
- Matching used the full numeric version prefix, not migration display name alone.
- The automated V2 migration filename/delimiter check and CI workflow passed on commit `dd6a48791a28f4fd2ea16f7659bd3fa5d71cb962`.

## Remaining blockers

- Production backup/PITR and fresh restore point are not verifiable through the connected actions; confirm them in Supabase Dashboard before any production DDL.
- No fresh production backup has been restored to an isolated rehearsal project.
- No approved production-derived forward migration set exists yet.
- Production schema has 18 public tables versus 46 in test and substantial object-level drift.
- The app's current Pages workflow is preview-only and points to the test project.

**Conclusion:** Test migration file/ledger mismatch is closed for the current V2 branch. Production reconciliation and rehearsal remain NO-GO.
