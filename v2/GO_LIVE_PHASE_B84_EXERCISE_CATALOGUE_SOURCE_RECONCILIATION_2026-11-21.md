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
- The existing expansion migration contributes 41 named exercises and is present in TEST.
- Combining the 56 Production names with the 41 migration names gives 97 unique names (no exact normalized name overlap between Production and that migration).
- Of those 97 names, 41 are absent from TEST; TEST also contains 38 names not found in Production or the 41-row expansion migration.

This proves that the 94-row TEST catalogue is not a safe clean-start replacement for the existing Production catalogue. In particular, a count-only check would conceal the loss of all 15 Pilates exercises.

## What the two catalogues contain

Production has the existing CrossFit, Pilates and Styrke seed catalogue. TEST has a different baseline with newer strength, conditioning, core, mobility and rehab exercises. Both catalogues contain useful material, but neither can be substituted for the other without reconciliation.

The 41-row migration `20261118084152_wod_exercise_catalog_expansion.sql` adds new dumbbell, kettlebell, medicine-ball and CrossFit movements. Its insert is idempotent by normalized exercise name. It does not restore the Production-only catalogue rows.

Examples of Production-only names missing from TEST include:
- The Pilates set: Pilates Hundred, Roll Up, Single Leg Stretch, Double Leg Stretch, Criss Cross, Spine Stretch Forward, Saw, Swan Prep, Swimming, Shoulder Bridge, Side Kick, Side Plank, Clam, Cat Stretch and Mermaid.
- CrossFit movements: Power Clean, Clean and Jerk, Power Snatch, Snatch, Push Jerk, Thruster, Toes-to-Bar, Handstand Push-up, Wall Ball Shot, Double Under and Single Under.
- Strength/cardio movements: Barbell Row, Dumbbell Shoulder Press, Lat Pulldown, Leg Press, Biceps Curl and Triceps Pushdown.

Examples of TEST-only names not found in Production or the 41-row expansion include Goblet squat, Strict press, Ring row, Dips, Dead bug, Bird dog, Hollow hold, Sit-up, Russian twist, Jogging, World greatest stretch, Ankle rocks and the rehab set. These should also be retained if they are intentional parts of the new catalogue.

## Release gate corrected

Updated `v2/supabase/preflight/exercise_catalog_integrity_assertions.sql` to require:
1. At least 90 seeded exercises.
2. At least 15 seeded Pilates exercises.
3. All seven required categories: CrossFit, Kjerne, Kondisjon, Mobilitet, Pilates, Rehab / fysio and Styrke.
4. No duplicate normalized seeded exercise names.

The previous gate checked only six categories and therefore incorrectly passed the 94-row TEST catalogue despite the absence of Pilates. The corrected gate is expected to fail on the current TEST catalogue until the Pilates seed is restored. This is intentional and is a release blocker, not a test defect.

## Required next implementation

Do not truncate, replace or reseed `public.exercises` from TEST's 94 rows. First construct a canonical catalogue migration/seed that reconciles:
- all 56 Production exercise identities and metadata;
- all 41 new exercises from the expansion migration;
- the 38 additional TEST-only exercise identities and metadata;
- semantic aliases and category differences, so the result does not create near-duplicate movements.

The final expected count must be computed after explicit alias review, not assumed to be 94 or 97. Preserve the Production Pilates entries and the newer mobility, conditioning, core and rehab exercises. Keep the user-visible unit semantics (e.g. plyo-box height in cm) intact.

Then run the corrected assertion against the isolated PostgreSQL 17 replay and prove the full canonical catalogue survives a clean-start rehearsal.

## Safety

All checks in this report used aggregate/read-only queries and source inspection. No exercise rows, Production schema, Auth identities, policies, or deployments were changed. Production remains untouched.
