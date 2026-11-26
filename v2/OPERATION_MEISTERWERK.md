# OPERATION MEISTERWERK – GESAMTWERKSTATT

First implementation: multi-plan local archive (20 projects, 12 retained revisions per project), explicit checkpoints and restore, 30 edit undo/redo steps within the open editor, planned weekly minutes, session count and WOD-format breakdown. Existing single autosaved working draft remains. No customer records or DB changes. Checkpoints are local, not shared and not a server-side version history. No claim of physiological load estimates.

P0: full CI, browser tests including isolated Tablet Lab, release artifact safety and cache bypass. Previous build blocked on obsolete cache version assertion; updated with actual bypass tests. P1 remaining: durable WOD project versions, multi-user collaboration, durable IDs and DB-level immutable snapshots, test scenarios, complete plan load analysis. P2 remaining: full lossless file exchange, shortcuts, bulk editing, catalogue controls. Do not deploy until all release gates applicable to changes are green.

Digital Twin scenario slice: open vs sequentially locked plan uses shared ptFlowRows and synthetic RPC guard. Built tablet browser test still blocked at WOD-card navigation in prior run; added message delivery diagnostics and pending content replay. No claim of end-to-end readiness. No production changes.

P0 isolation correction: the old alias matched ../lib/supabase.js but missed sibling ./supabase.js imports (e.g. auth.js). Resolve all relative imports by canonical path, reject SDK and real-client modules, strip inherited VITE credentials, and retain independent release-artifact checks. Build and browser verification required.

P0 follow-up: remaining hardcoded project reference located in production Safehouse backup library. Lab replaces the whole backup component with an unavailable notice and rejects the real backup modules. Release checker now reports offending filenames without printing credential values. Tablet browser test uses a scaled 800×1280 iframe matching the dock at 55%, and retains normal pointer clicks. New CI required; previous run had 344/344 responsive snapshots, but lab click was outside host viewport and artifact isolation failed.
