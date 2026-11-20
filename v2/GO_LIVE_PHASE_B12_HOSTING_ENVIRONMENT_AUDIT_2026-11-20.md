# GO LIVE Phase B12 – hosting and environment separation audit

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** PREVIEW PIPELINE VERIFIED; PRODUCTION DEPLOYMENT NOT CONFIGURED / NOT AUTHORIZED

## 1. Current Pages workflow

Inspected `.github/workflows/deploy-sturmkopf-pages.yml` on the STURMKOPF branch.

The workflow is explicitly a preview pipeline:

- Pushes to the STURMKOPF branch build the V2 app and upload a Pages artifact.
- The build hardcodes the TEST Supabase URL `https://izwzwvlexqxqewzijhhd.supabase.co` and its publishable key.
- The deployment job runs only on a manual `workflow_dispatch` with `publish_preview=true`.
- Publishing replaces the contents at the shared GitHub Pages URL.
- Push-triggered runs skip the deploy job; a successful build is not a published site.
- The workflow does not select production Supabase credentials and is not a production release pipeline.

This workflow must remain preview-only. Do not set `publish_preview=true` as part of the production GO LIVE procedure.

## 2. Environment separation requirements

A production deployment requires a separate, reviewed workflow/environment, not a modification that silently changes the preview workflow.

Required controls:

1. Separate preview and production build jobs/workflows with explicit environment names.
2. Production Supabase URL and publishable key supplied through protected environment variables/secrets; never reuse TEST values.
3. Production workflow must require a protected manual approval/environment gate and the exact reviewed release commit SHA.
4. Build provenance must record commit SHA, package lock hash, build artifact hash and target environment.
5. Production deployment must not run on ordinary branch pushes or documentation commits.
6. Rollback must identify the previous known-good app artifact and compatible database version. App rollback alone is not safe if the schema has advanced.
7. Post-deploy smoke tests must verify login/profile bootstrap, member access, PT, class booking, WOD selection, workout logging and PR history against the intended environment.
8. No production publishable key or production URL may be copied into the preview workflow or test environment.

## 3. CI status at this audit

The B10 documentation commit `7f7705920cc70583e640791b50d0c7d78566552f` completed both main verification workflows successfully. Its Pages build succeeded and the deploy job was skipped, as designed.

The B11 documentation commit `9028c4dccd6b1ebb946936a086518c7c3e91566c` has its Pages build cancelled; no deploy occurred. Its GarasjeGym 2.0 checks were still running at the time of this report. Previous B11-focused STURMKOPF test run on the immediately preceding B10 commit passed.

## 4. Execution boundary

No Pages publish, production hosting deployment, production environment variable change, secret change, Supabase DDL/DML or Auth change was made.

**B12 result:** Preview/production separation is explicit and verified. There is currently no approved production deployment workflow. A separate production pipeline must be designed only after schema reconciliation and recovery rehearsal are complete, and must be gated by explicit owner approval. Release remains **NO-GO**.
