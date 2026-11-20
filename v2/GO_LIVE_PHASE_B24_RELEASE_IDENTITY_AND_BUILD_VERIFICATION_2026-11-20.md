# GO LIVE Phase B24 – release identity and client build verification

**Date:** 2026-11-20  
**Release identity:** STURMKOPF FEUER 1.1  
**Decision:** RELEASE BRANDING ALIGNED; BUILD AND TESTS PASS

## 1. Issue found

A source review found stale release labels in the client despite the requested release name:
- Login and password-recovery brand displayed `STURMKOPF · 2.0`.
- Mobile header displayed `2.0`.
- Footer displayed `GARASJEGYM 2.0 · STURMKOPF`.
- Admin and training panels showed generic/old STURMKOPF labels.
- Browser title and README did not identify Feuer 1.1.

This was a release identity consistency issue, not a production database issue.

## 2. Changes committed on STURMKOPF branch

Added `v2/src/lib/release.js` as the single source of truth:
- `RELEASE_NAME = 'STURMKOPF FEUER 1.1'`
- `RELEASE_SHORT = 'FEUER 1.1'`

Updated:
- Both authentication brand placements and mobile header.
- Main app footer and in-app release notice.
- Admin control panel heading.
- Training-mode release badge.
- Browser document title.
- PWA manifest description.
- V2 README heading.

Verified the edited source contains no remaining old `STURMKOPF · 2.0`, `GARASJEGYM 2.0 · STURMKOPF` or mobile `<span>2.0</span>` branding.

The package's technical semver remains `2.0.0`; the user-facing release/codename is `STURMKOPF FEUER 1.1`. These identify the application generation and release label separately.

## 3. CI evidence for final B24 commit

Commit: `da6467a34b7b205e0c86d49420f80fb4ec76a92e`

- STURMKOPF focused tests and Vite build – SUCCESS (run `44827794496`).
- Full GarasjeGym 2.0 checks, including `npm test` and production bundle build – SUCCESS (run `44827794580`).
- Pages preview build and artifact upload – SUCCESS (run `44827794592`).
- Pages deploy job – SKIPPED.

No shared Pages publication or production deployment occurred.

## 4. Execution boundary

Changes are confined to the STURMKOPF GitHub branch and frontend metadata. No production Supabase schema/data/Auth/Storage, Edge Functions, secrets, hosting settings or paid resources were changed.

**B24 result:** Visible release identity is aligned with STURMKOPF FEUER 1.1 and all required CI checks passed. This does not pass the database recovery gate. Production remains **NO-GO**.
