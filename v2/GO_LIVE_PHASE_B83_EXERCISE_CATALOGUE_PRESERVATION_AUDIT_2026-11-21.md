# B83 – Exercise catalogue preservation audit
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Repository: tibraxTIMB/Garasjegym
Branch: `garasjegym-2.0-sturm­kopf`

## Verified live counts (read-only)

| Environment | Total exercises | Seeded rows (`created_by IS NULL`) | User-created rows |
|---|---:|---:|---:|
| Production `kultdmklwmilhoytrrig` | 56 | 56 | 0 |
| Test `izwzwvlexqxqewzijhhd` | 94 | 94 | 0 |

The earlier statement that 56 was the complete SturmKopf catalogue was incorrect. It is only the current Production count.

## Test catalogue by category

| Category | Seeded exercises |
|---|---:|
| CrossFit | 12 |
| Kjerne | 7 |
| Kondisjon | 9 |
| Mobilitet | 7 |
| Rehab / fysio | 5 |
| Styrke | 54 |
| **Total** | **94** |

## Source trail

- The Test project starts from a no-data schema fixture and then replays the branch migrations.
- `20261118084152_wod_exercise_catalog_expansion.sql` contributes 41 named exercise candidates. Its insert is idempotent by normalized exercise name, so pre-existing names are not duplicated.
- The Test database's resulting seeded catalogue is 94 rows, independently confirmed by read-only SQL.
- The production database currently contains 56 seeded rows and does not yet contain the complete expanded catalogue.
- The app reads the catalogue from `public.exercises`; the training screen displays `exercises.length` as the live count.

## Release protection added

Added `v2/supabase/preflight/exercise_catalog_integrity_assertions.sql`. This read-only assertion fails if:
1. Fewer than 90 seeded exercises exist.
2. Any of the six required categories is absent.
3. Duplicate normalized seeded exercise names exist.

The gate is intentionally a minimum threshold rather than an exact count, so a future deliberate catalogue expansion remains valid. It does not insert, update or delete exercises.

## Clean-start rule

A clean-start reset must preserve the entire standard exercise catalogue. It must not truncate or delete `public.exercises`, and it must not rebuild the catalogue from the 56 Production rows. The verified target baseline is the complete 94-row Test catalogue (or a later deliberately expanded catalogue that passes the integrity gate).

## Safety and remaining work

This audit queried only aggregate counts and category totals in Production and Test, and inspected the branch's migration/source files. No exercise rows, production schema, Auth identities, policies or deployments were changed.
