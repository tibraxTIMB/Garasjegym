# GO LIVE Phase B51 – exact candidate revision pin and regression guard

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Decision:** EXACT CANDIDATE PIN VERIFIED; FULL CI GREEN

## 1. Exact immutable candidate revision

The current Wave 1 candidate:
- Path: `v2/supabase/candidates/wave1_membership_auth_production_candidate.sql`
- GitHub blob SHA: `8e0227bb4fd7159a79635749bb8a91a09a4c7ebe`

The Wave 0 owner evidence template now explicitly records this path and blob SHA. Owner approval must reference this exact revision; if the candidate changes, the new blob SHA must be reviewed and approved.

## 2. Automated integrity test

Extended `v2/scripts/membership-candidate.test.mjs` to calculate the GitHub Git-blob SHA-1 from the checked-out candidate bytes (Git blob header + file content) and verify the owner evidence template contains that exact value.

The first run correctly failed because the template line had not been updated by the earlier text replacement. The template was corrected to include the exact candidate path and SHA. The rerun passed:
- Candidate isolation guard: PASS.
- Balanced dollar-quote check: PASS.
- Exact candidate revision pin: PASS.

This is a content-identity check, not a SHA-256 encrypted-backup checksum.

## 3. Final CI evidence on the corrected template

On commit `b2ded164d58342b4b85d85b5dbfb940d84ae6453`:
- Full GarasjeGym 2.0 checks **44833279263**: SUCCESS.
  - Automated tests all passed, including exact candidate hash pin.
  - Disposable PostgreSQL 17 candidate rehearsal: SUCCESS.
  - Isolated TEST bundle build and release artifact environment/secrets check: SUCCESS.
- STURMKOPF build and focused tests **44833279235**: SUCCESS.
- Preview artifact build **44833279279**: SUCCESS; deploy job SKIPPED.

No production or Supabase TEST data/schema/Auth/function/secret changes occurred. No preview or production publication occurred.

## 4. Execution boundary and outcome

The exact candidate file has a reproducible immutable revision pin. The PostgreSQL 17.12 rehearsal and app/test CI pass. This still does not prove a real Supabase Auth migration or restore of production UUIDs and data.

**B51 result:** Candidate revision approval control is now enforced by automated tests. Wave 0 owner backup and isolated Supabase restore remain outstanding. Production remains **NO-GO**.
