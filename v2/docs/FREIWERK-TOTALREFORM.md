# FREIWERK TOTALREFORM — binding build contract

Baseline: d03765e342a94795a197691f7cf725429fe3fc31 (production branch HEAD, not proof of currently deployed artifact).
No production release or database write is authorised by this candidate.
Scope is every UI, role, entry point, state, control, stylesheet, integration and runtime module.
The register covers source paths, not the number of screens; one file can render many surfaces.
A registered file is not a reviewed file. Every route, branch, modal, error and empty state must also be exercised.
Retained legacy entrypoints and lab/demo screens require verified use/disposition, never silent exclusion.

## Orders
01 shared visual tokens and source inventory; 02 choices and switches; 03 numeric/text input;
04 date/time/duration; 05 information, gestures, confirmation and action;
06 library/card; 07 builder; 08 session composer and training plan; 09 timer/Samspel/Synchron;
10 results/anatomy/history/PR; 11 PT/appointments/calendar/replay; 12 all remaining surfaces and final acceptance.
All modules must meet the same standard. Keep legacy controls accessible until replacements are verified.

## Production invariants
Preserve member IDs, permissions, WODs, historical results, PR, assignments, programmes and current sessions.
Never infer individual work from team totals. Timer authority, offline recovery, and valid format semantics are unchanged by styling.
No global hide of warnings or essential actions. No hidden-only gesture. Never split an ordinary word to fit a compact control.
Support mobile 320/360/390/430, tablet 768/1024, desktop 1440; portrait/landscape, keyboard and touch, member/staff/admin,
long names, empty/loading/error, zoom, fullscreen, active session, network loss and safe recovery. Use isolated test data only.
Visual profile is reversible within the candidate with ?design=classic; this is not a production rollback mechanism.

## Integration
Open work at baseline: #18, #19, #31, #32, #33, #34. They overlap on Training, WodBuilder, App, WodCard, WodLibrary,
SynchronPreparation and other modules. Do not blindly cherry-pick or replace. Review the diffs and reconcile after acceptance.
Do not edit production-release.json or existing release automation. The FREIWERK candidate is separate.

## Audit evidence
Run `node scripts/freiwerk-audit.mjs --json` from v2 to enumerate current source and static controls.
Run `node scripts/freiwerk-audit.mjs --release` for mandatory FREIWERK release gate.
Each register entry needs checks for every required dimension and concrete evidence (test report/screenshot/commit and scenario).
New files are automatically flagged unregistered; deleted files require reconciliation.
This is a separate total-reform release gate, not a claim that ordinary npm test already runs the full audit.
No approval is fabricated. The first candidate introduces shared appearance and register only.

## Integration slice 02–05
Imported PR #34 candidate changes after exact path-level conflict check against baseline. Extended shared weight-step controls to builder and FLOW, same-field navigation in builder, preset durations and guarded sheet gesture. All remain registered, not approved. PR #31/#32/#33 and older PRs still require reconciliation. Native date/time inputs retain semantic accessibility; full date/time, info and confirmation coverage remains pending.

## FW06–07 integration slice
Imported PR #33 by exact non-overlapping path comparison. WOD detail exposes Train now/Plan with role and launch-context guards; existing direct assignment and class launch stay on their existing paths. Guard WOD-card swipe around interactive controls; use shared date/time and confirmation in library entry; convert selected short builder menus to direct choices. Library grid and form controls restyled. Full builder migration and actual two-device Synchron/calendar validation remain pending; no approval recorded.

## FW08 slice
Session queue uses real execution builder for preflight, shows selected WOD exercise details and ordered list, keeps the original ephemeral execution snapshot and rejects unsupported combinations before start. Landscape splits queue and catalogue. PT appointment date/time fields use shared semantic component; WodPicker has filter count/reset. Saved multi-WOD scheduling and calendar-to-Synchron launch are not completed by this slice. Device testing and audit approval remain pending.

## FW09 slice
Integrated PR #31 after exact path comparison. Reconciled Training DNA switches and SynchronPreparation's preselected WOD prop from #33. Local shared Chipper progress, next movement and explicit completion are separate from server-authoritative Synchron. Synchron has clear leader/member identity, connection status, progression and explicit actual-result confirmation. Shared choice controls replace short preparation menus; no change to transport authority. Responsive audit workflow and Chipper test from #31 are included, not executed/verified here. Full timer format/device and live two-device tests remain open. No production writes or approval.

## FW10 slice
Integrated CLEAN UI #32 after conflict check. PT summary uses validated stored shared totals instead of empty participant rows; absent totals stay unknown. Synchron results classified as team, not individual. Historical team exercise profile uses available stored movements, explicitly planned/descriptive, never feeds PR or muscle history. Compact anatomy, result and PR surfaces, shared feedback confirmation and date field. Test fixture represents hypothetical two-goal 24:47, not the actual user's log. Full result, PR and device regression tests pending.

## FW11 slice
PT review can replay a currently published source WOD with the same client or create a new appointment. No reuse of completed assignment IDs or past scores. Replay uses current library version, not immutable historical prescription. PT calendar forwards exact appointment ID to PT list. Eligible single published Chipper appointments expose preselected Synchron preparation. This does not attach the Synchron session/log to the appointment, automatically complete the appointment, or support multi-WOD Synchron. Office mode remains guarded. Device and persistence tests pending.
