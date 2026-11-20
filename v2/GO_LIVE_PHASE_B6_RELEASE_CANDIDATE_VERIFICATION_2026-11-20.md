# GO LIVE Phase B6 – release candidate verification and security gate

**Date:** 2026-11-20  
**Candidate:** SturmKopf Feuer 1.1  
**Branch:** `garasjegym-2.0-sturm­kopf`  
**Verified commit:** `a6ff0270aad3332021fcc8e8332df6ede1d63aec`  
**Decision:** BUILD/TEST PASS; PRODUCTION NO-GO

## 1. Automated verification

GitHub Actions run [44825492673](https://github.com/tibraxTIMB/Garasjegym/actions/runs/44825492673) completed successfully on the current branch commit. Job: “WOD order tests, dependency resolution and Vite build”.

All 19 executed steps completed successfully, including:
- migration checks;
- training launch context and assignment routing;
- app base URL/auth redirects;
- infotainment calendar grouping;
- WOD complex exercises and ordering;
- exercise height/load measurements;
- WOD import and engine normalization/scoring;
- timer clock/split/finish calculations;
- group-class live timer phases;
- Spotify device compatibility;
- mobile swipe gesture classification;
- Bluetooth heart-rate parsing;
- Vite application build.

This proves the configured automated checks and build pass on this commit. It does not prove production schema compatibility, real-user end-to-end acceptance, restore readiness, or production deploy readiness.

## 2. Fresh Supabase advisor checks

### Production project `kultdmklwmilhoytrrig`
Security advisor (observed 2026-11-20 22:03 UTC):
- 4 authenticated-callable SECURITY DEFINER function warnings: `book_pt_session`, `is_active_user`, `is_admin`, `is_admin_or_manager`.
- Leaked-password protection is disabled.

Performance advisor includes:
- 14 unindexed foreign-key findings;
- 34 RLS init-plan findings.

These are recorded for scoped review. Do not blanket-revoke authenticated RPC execution or mass-edit policies/indexes; first establish which RPCs are intentional application entry points and test their authorization paths.

### Test project `izwzwvlexqxqewzijhhd`
Security advisor reports 25 authenticated-callable SECURITY DEFINER warnings and leaked-password protection disabled. The larger test finding count must not be copied to production as a remediation list without reviewing each function and its intended role.

Performance advisor reports unused-index findings. Treat these as observations only; do not drop indexes solely because the test workload has not exercised them.

## 3. Deployment workflow safety review

The branch's Pages workflow builds against the TEST Supabase URL and publishable key. Pushes build an artifact only. Publishing to the shared GitHub Pages URL requires manual workflow dispatch with `publish_preview=true`; that publication would replace the shared Pages content.

This workflow is a test preview path, not a production release pipeline. It must not be used as a substitute for the controlled production rollout. No Pages deployment was triggered.

## 4. Release gate

| Gate | Result |
|---|---|
| Current branch CI/build | PASS |
| Automated WOD/timer/gesture/measurement checks | PASS |
| Production schema compatibility | FAIL / unresolved (B3 blockers) |
| Backup/PITR evidence and isolated restore rehearsal | BLOCKED (B5) |
| Production Auth/profile membership compatibility | FAIL / unresolved |
| Class booking and waitlist schema parity | FAIL / unresolved |
| PT Studio schema/RPC parity | FAIL / unresolved |
| Production security review/remediation | OPEN |
| Owner production GO LIVE authorization | NOT RECORDED |

**Overall: NO-GO.** The app build is healthy, but production still lacks required schema dependencies and the recovery gate is unproven. Do not deploy the app or apply migrations/Edge Functions to production.

## 5. Next execution sequence

1. Continue source-level production compatibility work and prepare narrowly scoped, production-derived migration units with preflight and rollback notes.
2. Complete owner-supplied backup/PITR evidence and an isolated restore rehearsal using a cost-approved route.
3. Rehearse membership/Auth, class booking, PT Studio and WOD/workout migrations against a disposable copy or approved isolated target.
4. Run real authenticated role-based smoke tests and verify data preservation.
5. Only after all gates pass, request explicit owner GO LIVE authorization and execute the production change window.

No production database, Auth, Edge Function, hosting, project or branch changes were made during B6.
