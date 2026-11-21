# B84 – Exercise catalogue source reconciliation
Date: 2026-11-21
Release target: SturmKopf Feuer 1.1
Repository: tibraxTIMB/Garasjegym
Branch: `garasjegym-2.0-sturm­kopf`

## Executive result

The earlier conclusion that the 94-row TEST catalogue is a safe complete replacement for Production was incorrect. A fresh read-only comparison of the actual seeded exercise names found substantial catalogue drift.

- Production: 56 seeded exercises.
- TEST: 94 seeded exercises.
- Production category distribution: CrossFit 30, Pilates 15, Styrke 11.
- TEST category distribution: Styrke 54, CrossFit 12, Kondisjon 9, Kjerne 7, Mobilitet 7, Rehab / fysio 5.
- TEST has **zero Pilates rows**.
- Only 16 normalized exercise names overlap exactly between Production and TEST.
- The expansion migration contains 41 exercise names.
- Production plus all 41 expansion names forms 97 unique normalized names.
- 41 names in that 97-name set are absent from the live TEST catalogue: 40 Production names and one name from the expansion migration.
- TEST has 38 names not found in Production or the expansion migration.

This proves that the 94-row live TEST catalogue is not a safe clean-start replacement for the existing Production catalogue. A count-only check conceals the loss of all 15 Pilates exercises.

## What the two catalogues contain

Production has the existing CrossFit, Pilates and Styrke seed catalogue. TEST has a different baseline with newer strength, conditioning, core, mobility and rehab exercises. Both catalogues contain useful material, but neither can be substituted for the other without reconciliation.

The 41-row migration `20261118084152_wod_exercise_catalog_expansion.sql` adds new dumbbell, kettlebell, medicine-ball and CrossFit movements. The live TEST data does not contain every name in that source migration, so its migration history and current rows must not be treated as interchangeable evidence.

Examples of Production-only names missing from TEST include:
- The Pilates set: Pilates Hundred, Roll Up, Single Leg Stretch, Double Leg Stretch, Criss Cross, Spine Stretch Forward, Saw, Swan Prep, Swimming, Shoulder Bridge, Side Kick, Side Plank, Clam, Cat Stretch and Mermaid.
- CrossFit movements: Power Clean, Clean and Jerk, Power Snatch, Snatch, Push Jerk, Thruster, Toes-to-Bar, Handstand Push-up, Wall Ball Shot, Double Under and Single Under.
- Strength/cardio movements: Barbell Row, Dumbbell Shoulder Press, Lat Pulldown, Leg Press, Biceps Curl and Triceps Pushdown.

Examples of TEST-only names not found in Production or the 41-row expansion include Goblet squat, Strict press, Ring row, Dips, Dead bug, Bird dog, Hollow hold, Sit-up, Russian twist, Jogging, World greatest stretch, Ankle rocks and the rehab set. These are retained as additional library entries unless alias review establishes that a pair is genuinely the same movement.

## Corrective changes on the isolated release branch

1. Updated `v2/supabase/preflight/exercise_catalog_integrity_assertions.sql` to require:
   - At least 90 seeded exercises.
   - At least 15 seeded Pilates exercises.
   - All seven categories: CrossFit, Kjerne, Kondisjon, Mobilitet, Pilates, Rehab / fysio and Styrke.
   - No duplicate normalized seeded exercise names.

2. Added `v2/supabase/migrations/20261121090000_preserve_production_exercise_catalogue.sql`.
   - It adds the 40 Production exercise rows missing from the live TEST database.
   - It copies their current Production names, categories, equipment, descriptions, video URL, active flag and rehab flag.
   - It is additive only: rows already present by normalized name are left untouched.
   - It does not delete, update or truncate any exercise row.
   - It runs only as part of the isolated branch migration replay until separately reviewed and approved for Production.

The corrected gate is expected to fail against the current live TEST database before the additive migration is replayed. This is intentional.

## Required next implementation

Do not truncate, replace or reseed `public.exercises` from TEST's original 94 rows. Preserve the full union of the Production catalogue and the newer TEST-only exercises. Review semantic aliases and category differences so genuinely distinct variants remain available without accidental duplicates.

The final count must be measured after the new additive migration and explicit alias review. It must not be assumed to be 94 or 97. Preserve the 15 Pilates exercises and the newer mobility, conditioning, core and rehab exercises. Keep user-visible measurement semantics (e.g. plyo-box height in cm) intact.

Then run the corrected assertion against the isolated PostgreSQL 17 replay and verify the resulting catalogue count and categories.

## Safety

All source comparisons used read-only queries. The additive SQL was generated from the Production exercise snapshot and committed only to the isolated branch. No Production rows, schema, Auth identities, policies or deployments were changed.
