# GG DESIGN DNA

Shared control contract, first migration slice. No database change.

- Number entry: one DnaKeyMatrix in FLOW and CompactDoseGrid; domain hosts keep validation and navigation. Same positions; unsupported contextual keys disabled.
- Time: duration is compact by default with analog dial optional; calendar date/time remain native semantic fields with shared sizing. Clock time and elapsed duration are distinct concepts.
- Choice: direct visible choices for PT scheduling; long selections remain in existing accessible choice sheets.
- Switch: timer preferences are switches; completion and multi-selection remain checkboxes.
- Sheet: explicit close plus optional downward handle gesture; no swipe capture on scrollable content.
- Do not change source WOD, session, result, permissions or timer semantics as part of a visual refactor.
- Follow-up: audit all remaining dropdowns and details by actual role/format; migrate date/time, information sheets, confirmation dialogs and navigation in scoped batches; preserve keyboard and screen-reader controls. Full device audit is a release gate, not an assumed result.
