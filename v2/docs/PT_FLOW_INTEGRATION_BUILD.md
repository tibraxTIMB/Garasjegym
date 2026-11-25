# PT FLOW – integration candidate
Not for deployment before SQL replay and security checks. New fields are additive and default to open. Existing plan creation remains open; coach chooses mode in Plan. Per-session PT approval applies to sequential mode. Standalone WOD assignment no longer links to plan session via matching WOD ID; existing daily-WOD grouping stays as before. No new result table or log.

SQL is intentionally in preflight pending migration tooling and isolated replay. Before release test member/coach/admin RLS, rollback on locked save, concurrent reorder/save, copied week, manual progression, archived and restored programs, repeated WOD, and stale UI. Existing live app and Supabase unchanged. No guarantee of full integration until these checks pass.
