# STURMKOPF TÜV – release gate

Review findings are hypotheses until reproduced. This branch fixes cross-side previous-result contamination, completion-only metric leakage, and incorrect automatic PR classification for reviewed bodyweight exercises and Pilates Swimming. It builds on Bibliothekar and Volksmaschine, not a parallel architecture. No database mutation.

## Required evidence before publish
- P0: same-member retry after offline/reload, no duplicate save token, no retry after edits; server idempotence and authorization verified separately.
- P0: previous results distinguish sides, completion-only entries cannot produce measured PRs, team results never individual metrics. Muscle map is qualitative, not load or recovery score.
- P1: WOD formats must pass construction, timer, registration and saved-result paths; PT customer selection, assigned WOD, dated plan, result review and return navigation. Browser audit checks real components on synthetic data, not live user records.
- P1: compact layout, functional controls, input and keyboard navigation, narrow portrait/landscape. Run existing responsive browser audit on this candidate. Screenshots require human review.
- P1: catalogue candidates are not live until the additive SQL seed is applied and counted; preserve IDs. Independent library reviewer checks equipment, dosage, aliases, anatomical profile, WOD compatibility. Structured dosage and demonstrative media remain follow-up; do not fabricate URLs or universal loads.
- P0: one release branch, explicit test report, release artifact and deployment verification. Never conflate build/merge/publish. No live deployment without release authorization.

## Known limitations
No live multi-tenant/load testing, no verified physical device test, no clinical validation of anatomical profiles. Audit does not constitute evidence of zero defects. Existing user data must remain intact.
