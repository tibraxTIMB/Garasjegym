# GO LIVE Phase B26 – automated build-artifact safety gate

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Decision:** AUTOMATED TEST-ONLY ARTIFACT GUARD ADDED; FINAL CI GREEN

## 1. Guard added

Added `v2/scripts/check-release-artifact.mjs` and npm command `check:release-artifact`. The guard scans the built `dist` output and fails the workflow if:
- The isolated TEST Supabase project reference is missing.
- The production Supabase project reference is present.
- A `service_role` literal is present.
- A value matching an actual `sb_secret_...` token pattern is present.
- The `STURMKOPF FEUER 1.1` release label is missing.
- Required WOD Builder, PT Studio, Training or Admin lazy-loaded JS assets are missing.
- The built index or web manifest is missing.

The guard is wired after Vite build in all three workflows:
- STURMKOPF focused verification.
- Shared Pages preview build.
- Full GarasjeGym 2.0 checks.

The two verification-only workflows now build explicitly against the isolated TEST Supabase project, not an unconfigured client and never production. The full-check workflow step is labelled "Build isolated TEST bundle" to avoid suggesting a production build.

## 2. Failure found and corrected

The first guard execution correctly failed because the STURMKOPF verification workflow did not pass TEST Supabase environment variables to Vite. The built bundle therefore had no TEST project reference.

Corrected both verification workflows to inject the existing TEST project URL and publishable key into the build step. This is a public publishable key, not a service-role/secret key. The failure was environmental configuration, not an application test failure.

## 3. Final CI evidence

Latest commit: `54d64c717bbf80823f3ef4748d38e97fadd21461`

- Full GarasjeGym 2.0 checks run `44828172562`: SUCCESS. Migration check, complete `npm test`, Vite build and artifact safety gate all passed.
- STURMKOPF focused run `44828172172`: SUCCESS. Focused test suite, Vite build and artifact safety gate all passed.
- Shared Pages workflow run `44828097148`: build and artifact safety gate SUCCESS; deploy SKIPPED.

No Pages publication or production deployment occurred.

## 4. Execution boundary

Only source-controlled CI checks and TEST-configured build steps were changed. No production Supabase schema/data/Auth/Storage, Edge Functions, secrets, hosting settings or paid resources were changed.

**B26 result:** Future CI builds are now automatically checked for correct TEST-only environment, release identity, required modules and absence of privileged keys. Final focused and full CI are green. Production remains **NO-GO** pending Wave 0 backup/recovery and isolated restore evidence.
