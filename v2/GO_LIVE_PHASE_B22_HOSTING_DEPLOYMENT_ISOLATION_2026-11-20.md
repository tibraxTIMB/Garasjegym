# GO LIVE Phase B22 – hosting and deployment isolation revalidation

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** PREVIEW PIPELINE IS TEST-ONLY; NO PRODUCTION DEPLOYMENT PATH EXISTS

## 1. Workflow source audit

Reviewed these workflow files on the STURMKOPF branch:

- `.github/workflows/deploy-sturmkopf-pages.yml`
- `.github/workflows/sturmkopf-verify.yml`
- `.github/workflows/garasjegym-v2.yml`

### Preview workflow

The Pages workflow builds against the TEST Supabase project URL `https://izwzwvlexqxqewzijhhd.supabase.co`, using its publishable key. It does not reference the production Supabase project. Pushes to the STURMKOPF branch build an artifact only.

Publishing to the shared GitHub Pages URL requires a manual `workflow_dispatch` with `publish_preview=true`. The workflow explicitly warns that this replaces the current shared Pages content. The deploy job is skipped for normal push events.

### Verification workflows

- `sturmkopf-verify.yml`: Node 22, migration delimiter checks, targeted WOD/order/dependency/launch/gesture/timer/media tests and Vite build.
- `garasjegym-v2.yml`: Node 20, migration delimiter check, full `npm test` and Vite build.

Neither workflow applies migrations or deploys to production.

## 2. Latest preview workflow outcome

For B20 commit `c29aef7456eaf2f87a909d813fed20dc16c4dd9f`:
- Pages build: SUCCESS.
- Pages deploy: SKIPPED.
- Therefore no Pages content was published by that run.

For B21 commit `b77a4cac20f20be4713fdee9a16a459d89a03976`, the Pages build was still running when this phase was recorded. Its deployment condition remains false for push events, so a push cannot publish the shared Pages site.

## 3. Production release gap

There is no dedicated production workflow in the reviewed workflow set. A production release process would need, at minimum:

- A protected production environment and manual approval gate.
- Production-only URL and publishable key, never reused from preview.
- Exact commit and immutable build-artifact provenance.
- A migration plan based on production schema baseline, not the TEST ledger.
- Preflight and postflight checks, explicit backup/restore evidence, and rollback/forward-fix plan.
- Smoke tests against production after deployment.
- No automatic deployment on push.

Do not add or activate this workflow until Wave 0 recovery is proven and the production migration package is independently rehearsed. A disabled/guarded workflow would not solve the underlying recovery and schema incompatibility blockers.

## 4. Execution boundary

Only workflow source and GitHub Actions run/job metadata were inspected. No Pages publish was initiated, no production workflow was added, no secrets were read or changed, and no production Supabase settings were modified.

**B22 result:** Preview is isolated to TEST; shared Pages publication is manually gated; no production deploy path is present. Production remains NO-GO.
