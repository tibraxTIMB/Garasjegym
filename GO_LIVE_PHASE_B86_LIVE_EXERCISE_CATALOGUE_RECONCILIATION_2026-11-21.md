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

The manifest preserves source provenance and source-specific category/equipment metadata. For names already in Production, the migration leaves their existing names, categories, equipment, descriptions, video URLs, active and rehab flags untouched. It fills only missing `body_area` values: from the exact TEST counterpart where available, otherwise `Fullkropp`. It inserts any of the 135 manifest names missing from the target. On current Production, 79 names are absent (78 TEST-only plus one expansion-only); on current TEST, only the expansion-only name is absent. On a clean no-data replay it also fills names not supplied by the small demo fixture or earlier expansion migrations. No exercise is deleted.

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

### Category conflicts on exact-name overlaps

| Exercise | Production | TEST |
|---|---|---|
| Air Squat | CrossFit | Styrke |
| Back Squat | CrossFit | Styrke |
| Bike Erg | CrossFit | Kondisjon |
| Box Jump | CrossFit | Kondisjon |
| Burpee | CrossFit | Kondisjon |
| Deadlift | CrossFit | Styrke |
| Front Squat | CrossFit | Styrke |
| Plank | Styrke | Kjerne |
| Pull-up | CrossFit | Styrke |
| Row | CrossFit | Kondisjon |
| SkiErg | CrossFit | Kondisjon |
| Walking Lunge | CrossFit | Styrke |

### Equipment conflicts on exact-name overlaps

| Exercise | Production | TEST |
|---|---|---|
| Back Squat | Vektstong | Stong og rack |
| Bench Press | Vektstong / benk | Stong/benk |
| Bike Erg | BikeErg | Ergometersykkel |
| Box Jump | Plyoboks | Kasse |
| Bulgarian Split Squat | Manualar / benk | Benk/manualar |
| Deadlift | Vektstong | Stong |
| Front Squat | Vektstong | Stong og rack |
| Hip Thrust | Stong / benk | Stong/benk |
| Plank | Matte | Kroppsvekt |
| Romanian Deadlift | Vektstong / manualar | Stong/manualar |
| Walking Lunge | Kroppsvekt / manualar | Kroppsvekt/manualar |

### Alias candidates retained pending review

| Names | Assessment |
|---|---|
| Barbell Row / Bent-over row | Same apparent barbell bent-over rowing movement; compare grip/stance and source intent. |
| Dumbbell row / One-arm Dumbbell Row | Both source descriptions specify one-arm dumbbell rowing. |
| Kettlebell Deadlift / Markløft / Kettlebell markløft | Both describe kettlebell deadlift from the floor. |
| Pull-up / Strict pull-up | Strict and assisted/general variants may be materially different. |
| Step-up / Box Step-up / Dumbbell Step-up | Bodyweight, box and externally loaded variants may be distinct. |

## Plyo-box measurement contract
The application measurement resolver identifies box jump, step-up and box-over movements as height-based and uses centimetres. Externally loaded variants can record both height (cm) and load (kg). This behaviour is retained; the catalogue migration does not replace measurement logic or create inches-based values.

## Transactional migration rehearsal (2026-11-21)
The two forward catalogue migrations (Production catalogue preservation + reconciled 79-row seed) and the exact 135-name assertion were executed inside explicit `BEGIN ... ROLLBACK` transactions against both Production and TEST. Both dry-runs completed without SQL errors and the assertion passed in-transaction. Post-rollback read-only checks confirmed no persistent changes: Production remains 56 system exercises with 56 legacy NULL body-area values; TEST remains 94 system exercises with zero missing body-area values. No migration was applied or recorded in either environment.
The rehearsal was repeated with both catalogue migrations applied twice in the same rolled-back transaction on both environments. Both second-pass runs also completed without error and the exact 135-name assertion passed, confirming idempotent name-based insertion. No rows or migration ledger entries persisted.


## Safety and next gate
The migration is additive and forward-only. It inserts from the complete 135-name manifest, guarded by normalized name, so the same migration can safely run against Production, the current TEST project, or a clean no-data replay without overwriting existing rows. It has not been applied to Production or TEST by this work. Run the new exact manifest assertion against the isolated PostgreSQL 17 replay after the full migration/fixture replay. Then review aliases, category decisions, metadata and the build/test results. Production backup, lineage, Auth/RLS and explicit final GO LIVE gates remain outstanding.
