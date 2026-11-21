# B86 – Live source catalogue reconciliation and manifest
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch: `garasjegym-2.0-sturm­kopf`

## Direct read-only database verification
Queried `public.exercises` in Production (`kultdmklwmilhoytrrig`) and TEST (`izwzwvlexqxqewzijhhd`), restricted to system rows (`created_by IS NULL`). No rows were changed.

| Source | System rows |
|---|---:|
| Production | 56 |
| TEST | 94 |
| Expansion migration candidates | 41 |
| Exact normalized overlap Production/TEST | 16 |
| Production-only | 40 |
| TEST-only | 78 |
| Expansion-only (missing from both live catalogues) | 1 |
| **Provisional union** | **135** |

The expansion-only entry is `Kettlebell markløft`. It is added by the new forward migration.

## What was committed
- Canonical source manifest: `v2/supabase/catalog/exercise_catalogue_manifest_sturmKopf_feuer_1_1.json`
- Forward additive migration: `v2/supabase/migrations/20261121100000_seed_reconciled_exercise_catalogue.sql`
- Read-only exact acceptance: `v2/supabase/preflight/exercise_catalogue_manifest_assertions.sql`

The manifest preserves source provenance and source-specific category/equipment metadata. For names already in Production, the migration leaves their existing names, categories, equipment, descriptions, video URLs, active and rehab flags untouched. It fills only missing `body_area` values: from the exact TEST counterpart where available, otherwise `Fullkropp`. It adds the 78 TEST-only names and the one expansion-only name. No exercise is deleted.

## Provisional category distribution
Based on the manifest's Production-first metadata precedence:
- CrossFit: 42
- Styrke: 56
- Pilates: 15
- Mobilitet: 7
- Kjerne: 6
- Kondisjon: 4
- Rehab / fysio: 5

## Outstanding quality review
- 12 exact-name overlaps have different category labels between Production and TEST.
- 11 exact-name overlaps have different equipment labels.
- All 135 source rows currently have no video URL. No links have been invented; verified demonstrations can be added later.
- Five semantic alias/variant groups are explicitly flagged in the manifest. Three look like possible duplicates; two need variant confirmation. They are retained for now to avoid silently deleting distinct movements.
- The final count is therefore a provisional 135, not a release claim until the alias decisions and category mapping are reviewed.

## Plyo-box measurement contract
The application measurement resolver identifies box jump, step-up and box-over movements as height-based and uses centimetres. Externally loaded variants can record both height (cm) and load (kg). This behaviour is retained; the catalogue migration does not replace measurement logic or create inches-based values.

## Transactional migration rehearsal (2026-11-21)
The two forward catalogue migrations (Production catalogue preservation + reconciled 79-row seed) and the exact 135-name assertion were executed inside explicit `BEGIN ... ROLLBACK` transactions against both Production and TEST. Both dry-runs completed without SQL errors and the assertion passed in-transaction. Post-rollback read-only checks confirmed no persistent changes: Production remains 56 system exercises with 56 legacy NULL body-area values; TEST remains 94 system exercises with zero missing body-area values. No migration was applied or recorded in either environment.

## Safety and next gate
The migration is additive and forward-only. It has not been applied to Production or TEST by this work. Run the new exact manifest assertion against the isolated PostgreSQL 17 replay after the full migration/fixture replay. Then review aliases, category decisions, metadata and the build/test results. Production backup, lineage, Auth/RLS and explicit final GO LIVE gates remain outstanding.
