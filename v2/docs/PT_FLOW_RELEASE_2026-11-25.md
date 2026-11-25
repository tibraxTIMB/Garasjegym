# Gazelle PT FLOW release — 25 November 2026

- Rehearsal and candidate build passed on commit 0ab23c55715ce26263967d028f16165c8bea025c.
- Active Pages database binding preserved (existing garasjegym-2-test project, used by live deployment).
- Supabase migration 20261125132414_pt_flow_unlock applied successfully and recorded in migration history. Verified 4 new columns, 2 RPCs, 2 enabled guards; anonymous start RPC denied; authenticated execute granted. Before/after row counts unchanged: profiles 4, workouts 3, standalone PT assignments 1, plans 0, plan sessions 0.
- Existing plans default open; progression presets suggest sequential PT approval. No reset, replacement, or data deletion.
- Publish through established gated workflow; signed-in mobile/tablet journey remains to be verified.
- Isolated fixture uses real PT policies and linkage RPC, but synthetic auth and lower-level workout writer; not equivalent to live end-to-end test.
