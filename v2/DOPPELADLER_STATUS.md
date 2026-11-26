# Doppeladler integration ledger

Baseline: 27cdf92af01e99ef2f600236d1c30f79006f1f99. Production and database changes prohibited without approval.

| Package | Existing implementation anchors | Remaining verification |
|---|---|---|
| DA01 | Existing library and test tree inspected | Full call-site and data contract audit |
| DA02 | trainingLaunchContext, workoutFlow, workoutCorrections | Identity and lifecycle across entry points |
| DA03 | wodArchitect, compositeWod, wodCard | Quality and conversion UX |
| DA04 | samspel, SamspelParticipantResults | Remove AMRAP-only constraint without breaking legacy |
| DA05 | garageInventory, equipmentPreparation | Exact symmetric and simultaneous allocation |
| DA06 | timerClock, timerCues, groupClassLiveTimer | Shared execution and rotation |
| DA07 | resultReview, resultValidation, workoutDraft | Unified editable results |
| DA08 | ptFlow, ptSchedule, ptPreparationHistory | Dated assignments and customer context |
| DA09 | anatomicalIntelligence, prMetrics, roundGhost | Actual individual work and corrections |
| DA10 | coffeeCart, invitationFlow | Optional social completion and open garage |
| DA11 | memberViewMode, calendarView | Role-specific navigation |
| DA12 | offlineTraining, safehouse, existing regression scripts | Execute tests and practical journeys |

No package is approved by this ledger. File presence is not proof of functionality. Existing tests have not been executed in this run. All 17 acceptance journeys remain unverified. Reuse existing modules; no production deployment or migration.

## 2026-11-26 implementation checkpoint

Verified branch a99cd0212fbeddab453016f4fb16919a480c0011: production-target build-only, isolated validation, Frontdienst and responsive audit all successful (runs 45867490448, 45867490408, 45867490426, 45867490590). No production deployment. No DB migration.

| Package | Implemented changes, not final acceptance | Remaining |
|---|---|---|
| DA01 | Evidence ledger | Full architecture and call-site audit |
| DA02 | Save acknowledgement before refresh | Unified lifecycle and all entry points |
| DA03 | Quality & Row and Engine Swap builder conversion | Composite tracks and remaining templates |
| DA04 | Legacy AMRAP preserved; Quality & Row; Engine Swap EMOM with 2–8 slots, one erg, equal rotations (e6a4d4f5) | General tracks, named participants, remaining formats/templates |
| DA05 | Exact concurrent symmetric plate allocation (2053b874); inventory, builder, PT and Samspel preparation (5fc4535a, 8b0bb064) | Automatic prescription-based preparation, physical limits and remaining integration |
| DA06 | Shared timer, Quality & Row, Engine Swap | Composite and Arena-specific verification |
| DA07 | Actual quality/interval results; no EMOM prefill in Engine Swap; explicit team completion evidence | Full correction and all formats |
| DA08 | Shared inventory in PT preparation; personal evidence guard | Customer workflow, dated plan lifecycle |
| DA09 | Reject team/unknown evidence in personal metrics (bd184f96) | Individual identity and all corrections |
| DA10 | Optional coffee/timetable after save (a99cd021) | Open garage, invitations and explicit sharing |
| DA11 | Post-save home actions (a99cd021) | Role-adaptive home and navigation audit |
| DA12 | Four CI checks green on a99cd021; 84 direct Engine Swap assertions on e6a4d4f5; new assertions for completion | CI on newest changes, dedicated browser journeys and practical member/PT testing |

Engine Swap v2 explicitly uses one machine, full equal rotations, 2–8 slots; not Double EMOM or arbitrary multi-track programming. Slot records are not authenticated identities. New CI pending at this checkpoint. No package fully accepted; 17 original acceptance journeys not fully verified. No production publishing or database changes.

## Samspel template checkpoint – 2026-11-26
All seven requested templates now have a first standalone implementation: Quality & Row, Engine Swap (e6a4d4f5), Iron Twins (1959fbd5), Double EMOM (32691fae), Active Recovery (7ef89320), You Go I Go (d0a9fb03), Team Chipper (56b4e6d7). Team Chipper is limited to 1–30 unambiguous repetition-based movements; actual contributions must be explicitly recorded (including zero), and over-target totals require review. Direct checks: 10 Iron Twins, 282 Double EMOM, 35 Recovery, 56 relay, 49 Chipper. All four CI checks on Iron Twins passed; Chipper CI pending at this checkpoint. PT preparation now shows roles and instructions from the same saved WOD schema; PT review uses team-only metrics and does not infer a customer's personal dose from team completion. No authenticated per-slot member assignment or composite Samspel acceptance yet. No database or production change. All 17 original journeys remain to be fully verified.

## PT and history safeguards
Plan review uses only saved plan snapshots for prescription; direct assignment review has no verified immutable prescription snapshot in this UI, so current library dose is not used as historical evidence. Full PT WOD panel remounts for a new customer. Program rows show planned date/time and completion date separately. Samspel history shows recorded team results instead of inferred personal exercise totals. Generic Samspel result correction is blocked (notes remain editable) until a dedicated consistent participant-result correction exists; no data is rewritten. Remaining acceptance: actual correction, composite Samspel, identity binding, dated plan and social end-to-end journeys, practical devices.

## Continued P0/P1 checkpoint
Dedicated Samspel correction for seven standalone templates (d46fa55d) changes the existing log only; status-changing corrections remain blocked, no database write test. Lastmeister prescription picker (990b5d6d) offers explicit kg values only, requires manual choice and compatibility. PT single-session entry now synchronizes date/plan slot, includes optional time and clears draft on client change. No production or schema changes. Full acceptance remains open.

## Mission Control, Kameradschaft and acceptance checkpoint
Dedicated result screen for all seven templates (d2e08cc1); profile shortcut restored (3a13ce06); isolated validation, production-target build and Frontdienst passed on 3a13ce06, responsive pending at observation. Quick Open Gym uses ordinary booking, explicit publication, no automatic enrolment; opt-in text drafts reuse social posts (bd0a70b1). Added real Training browser journey for manual Quality & Row, invalid empty contribution, draft reload, partial result, no personal PR; awaiting CI, not yet passed. No production deployment or database change. Composite Samspel and authenticated slot identity remain open. The 17 acceptance journeys are not fully verified.

## Composite noncompetitive Samspel checkpoint
Quality & Row manual browser journey initially detected two identical alerts; scoped alert fix a8173cb0 passed Frontdienst and isolated validation. First composite Quality & Row/Active Recovery support f44bc028: own per-block timer and measured participant status, source WOD snapshot retained, eight direct checks passed. Composite team evidence is conservatively excluded from personal PR/anatomy/Ghost; no authenticated identity mapping. Subsequent merge makes actual block status authoritative over timer summary and shows roles/results in PT. Other five templates remain standalone only, composite participant correction not implemented, practical testing and latest full CI pending. No production or database changes.
