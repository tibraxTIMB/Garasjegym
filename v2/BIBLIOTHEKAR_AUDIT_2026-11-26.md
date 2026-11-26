# Doppeladler – Bibliothekar

Active catalogue checked against deployed workflow database: 213 active, 19 Mobilitet, 15 Pilates, 5 Rehab / fysio, 17 Kjerne. All have description/equipment/body_area; 80 use broad Fullkropp, 213 lack video URLs, 209 have no structured prescription profile. No existing row IDs, logs, PRs, or policies changed in this build.

## Findings
- WOD dose and result resolver could incorrectly demand load for bodyweight mobility. Fix explicit mobility defaults while preserving stored load in result resolver.
- Generic pull-up classification could hide scapular pull-ups in Gymnastikk. Mobility category now takes precedence.
- Side selector previously allowed only weighted unilateral movements; now covers reviewed mobility/stability names.
- Quality-only movements added by the mobility expansion do not produce derived exercise records. Historical log rows are never deleted; historic derived records for these exact names may no longer be shown. Weighted variants of these quality-only catalogue names remain outside automatic PRs.
- Anatomical catalogue: exact profiles for the new movements, with mobility-only rows intentionally empty of strength-role muscle counts. These are provisional qualitative labels, not measurements.

## Follow-up
All 213 active names now resolve an exact provisional anatomical profile, including Bear Crawl, Clean Deadlift, Hanging Knees to Chest and Sumo Deadlift High Pull. No actual muscle-activation measurements are claimed.

21 new candidate catalogue entries (none persisted by this commit): Shoulder CARs, Wrist circles, Wrist flexor stretch, Wrist extension stretch, Adductor rock back, Couch stretch, Hamstring stretch, Pec doorway stretch, Lat stretch, Child's pose, Downward dog, Low lunge, Pigeon stretch, Banded lateral walk, Single-leg balance, Single-leg glute bridge, Pallof press, Single-leg RDL, Landmine press, Landmine row, Landmine squat. All have an exact anatomical profile. Existing catalogue IDs remain unchanged. Tibialis raise is deferred because the current anatomy model does not represent tibialis anterior. No equipment ownership is assumed beyond candidate equipment labels; verify in the app.

Read-only audit SQL and additive candidate seed are in v2/supabase/preflight. Mobility default dose suggestions are descriptive, not prescribed universal loads.

## Release gate
Run npm test and npm run build, confirm target database, review candidate seed and apply only once release approved. Manually exercise WOD builder, side-aware dosage, timer, completed-only registration and PR screen. Review broad area labels and catalogue aliases, and verify video demonstrations. No deployment or database mutation authorized by this candidate alone.
