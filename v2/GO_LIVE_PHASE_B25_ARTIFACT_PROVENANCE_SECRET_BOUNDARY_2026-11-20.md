# GO LIVE Phase B25 – built artifact provenance and secret-boundary audit

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Decision:** PREVIEW ARTIFACT VERIFIED; NO DEPLOYMENT

## 1. Artifact provenance

Downloaded the GitHub Pages build artifact from workflow run `44827794592`.

- Artifact ID: `14674632850`
- Artifact name: `github-pages`
- Source commit: `da6467a34b7b205e0c86d49420f80fb4ec76a92e`
- Source branch: STURMKOPF development branch
- GitHub artifact SHA-256: `edf8112444ef52790608aabd3c473f6397b8cf4bfbf3aa094ab048e2a342bafe`
- Locally computed SHA-256: identical
- Archive contains 39 tar entries (37 regular files), including app entry point, manifest, service worker, and lazy-loaded Training, PT Studio, WOD Builder, Admin and other module assets.

## 2. Environment and secret scan

Inspected all built HTML, JS, CSS, manifest and service-worker files.

| Check | Result |
|---|---|
| TEST project reference present | PASS – `izwzwvlexqxqewzijhhd` |
| Production project reference absent | PASS |
| `service_role` literal absent | PASS |
| Actual `sb_secret_...` token absent | PASS |
| Private-key PEM header absent | PASS |
| Visible release name `STURMKOPF FEUER 1.1` present | PASS |

The Supabase JS SDK bundle contains the literal prefix `sb_secret_` in code that recognizes key formats. It is not a secret key value. A token-pattern scan found zero actual `sb_secret_...` values.

The artifact uses the TEST Supabase URL and its publishable key. No production URL, service-role key or secret key is present.

## 3. Deployment status

The artifact's workflow deploy job was SKIPPED. The artifact has not been published to the shared Pages URL and has not been deployed to production.

Publishing to the shared Pages URL would replace existing shared content and remains a separate explicit action. Production deployment remains prohibited pending recovery and migration gates.

## 4. Execution boundary

Only the CI artifact was downloaded and inspected. No GitHub Pages publication, production deployment, Supabase change, secret read/write or paid resource was performed.

**B25 result:** Artifact provenance, release label and environment boundary verified. This is a verified TEST preview artifact, not a production release. Production remains **NO-GO**.
