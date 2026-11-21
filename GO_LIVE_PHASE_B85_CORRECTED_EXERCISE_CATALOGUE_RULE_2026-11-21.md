# B85 – Corrected clean-start exercise catalogue rule
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch: `garasjegym-2.0-sturm­kopf`

## Correction
The exact-94 catalogue requirement added during the clean-start policy update was too narrow and is withdrawn. The read-only catalogue audit in B83/B84 proves that the TEST 94 is not a complete replacement for Production plus the expansion set.

Verified source facts from B83/B84:
- Production: 56 seeded rows (30 CrossFit, 15 Pilates, 11 Styrke).
- TEST: 94 seeded rows (12 CrossFit, 7 Kjerne, 9 Kondisjon, 7 Mobilitet, 5 Rehab/fysio, 54 Styrke; no Pilates).
- Only 16 normalized names overlap between Production and TEST.
- The expansion migration has 41 candidate names.
- The combined Production + expansion source set has 97 unique names; 41 of these are missing from TEST.
- TEST has 38 additional names not in Production or the expansion source.
- Therefore neither 94 nor 97 is a safe final exact target. Preserve the full union after explicit semantic-alias review; derive the exact final count from a reviewed canonical manifest.

## Correct release rule
1. Retain every distinct Production exercise, including all 15 Pilates exercises.
2. Retain all distinct TEST-only exercises, including core, conditioning, mobility and rehab content.
3. Retain all distinct expansion-migration candidates.
4. Review aliases and near-duplicates by movement, equipment, variant and measurement semantics. Do not merge distinct variations merely because names are similar.
5. Preserve measurement metadata, including plyo-box height measured in cm.
6. Generate a canonical manifest with normalized name, category, equipment, body area, description, rehab flag, active flag, video URL and measurement prescription.
7. Set the final exact count only after the manifest has been reviewed and reconciled. No guessed count is acceptable.

## Gate status
The current SQL gate now uses a minimum threshold plus explicit category/Pilates/duplicate checks. It is an interim safety net, not proof that the full union has been preserved. Final GO LIVE remains blocked until the canonical manifest and exact-name comparison are implemented and pass on the isolated PostgreSQL 17 replay.

## Safety
No Production data, schema, Auth identities, RLS, functions or deployment was changed.
