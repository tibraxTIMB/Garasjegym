# Doppeladler – Bibliothekar

Active catalogue checked against deployed workflow database: 213 active, 19 Mobilitet, 15 Pilates, 5 Rehab / fysio, 17 Kjerne. All have description/equipment/body_area; 80 use broad Fullkropp, 213 lack video URLs, 209 have no structured prescription profile. No existing row IDs, logs, PRs, or policies changed in this build.

## Findings
- WOD dose and result resolver could incorrectly demand load for bodyweight mobility. Fix explicit mobility defaults while preserving stored load in result resolver.
- Generic pull-up classification could hide scapular pull-ups in Gymnastikk. Mobility category now takes precedence.
- Side selector previously allowed only weighted unilateral movements; now covers reviewed mobility/stability names.
- Quality-only movements added by the mobility expansion do not produce derived exercise records. Historical log rows are never deleted; historic derived records for these exact names may no longer be shown. Weighted variants of these quality-only catalogue names remain outside automatic PRs.
- Anatomical catalogue: exact profiles for the new movements, with mobility-only rows intentionally empty of strength-role muscle counts. These are provisional qualitative labels, not measurements.

## Unclassified names after this code change (4)
- Bear Crawl
- Clean Deadlift
- Hanging Knees to Chest
- Sumo Deadlift High Pull

## Missing coverage candidates (not inserted by this build)
- Shoulder CARs, wrist circles, wrist flexor/extension stretch, adductor rock back, couch stretch, hamstring stretch, pec doorway stretch, lat stretch.
- Yoga: child's pose, downward dog, low lunge, pigeon stretch.
- Stability: tibialis raise, banded lateral walk, single-leg balance, single-leg glute bridge, Pallof press, single-leg RDL.
- Verify equipment ownership and actual variant names before seed. Do not merge semantic aliases silently; no fabricated videos or universal loading values.

## Release gate
Run npm test and npm run build; manually exercise WOD builder, side-aware dosage, timer, completed-only registration and PR screen. Review missing anatomical profiles, broad area labels and catalogue aliases. No deployment or database mutation authorized by this candidate alone.
