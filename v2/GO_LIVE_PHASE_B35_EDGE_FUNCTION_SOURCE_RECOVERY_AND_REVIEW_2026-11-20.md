# GO LIVE Phase B35 – production Edge Function source recovery and compatibility review

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Function:** `garasjegym-music` v2  
**Scope:** source recovery and static review; no deploy or secret access

## 1. Production source recovered into version control

Production currently has one active Edge Function:
- `garasjegym-music`, version 2.
- `verify_jwt=false`.
- Supabase-reported source SHA-256: `3e369166c2c425c20c0e6af8e49adeaeef96c6e192479102f09a6acde1850e69`.

The function was absent from the STURMKOPF branch. Its deployed `index.ts` source was retrieved through the Supabase function source API and archived at:
`v2/supabase/functions/garasjegym-music/index.ts`.

A fresh source comparison confirms the repository file matches the deployed production `index.ts` byte-for-byte (3,200 characters). The deployed source hash is recorded above. The archived source contains environment variable names only; no secret values were read or committed.

TEST has two additional functions, `admin-create-user` and `admin-delete-user`; neither is deployed in production. Do not promote these TEST functions without separate Auth lifecycle, role, deletion and data-preservation review.

## 2. Static security and compatibility review

Positive controls:
- Although platform JWT verification is disabled, the function manually requires a Bearer token and validates it by calling Supabase Auth `/auth/v1/user`.
- It uses the returned authenticated user UUID to fetch only that user's `profiles` row.
- It rejects users without an active profile.
- It does not return profile PII; response contains staff boolean and current track metadata.
- Service-role and Soundtrack credentials are read only from server-side environment variables.
- It only supports POST and OPTIONS; no database writes are performed by this function.

Items to carry into the release:
1. **Membership compatibility:** current function checks `profile.active` only. Production currently has no `membership_status` column. When Wave 1 introduces approved/pending membership, update the function to require both `active=true` and `membership_status='approved'` (or a clearly documented equivalent), and test admin/manager/member/pending/rejected accounts.
2. **CORS:** current `Access-Control-Allow-Origin: *`. This is not an authentication bypass because a valid Bearer token is still required, but once the final app origin is fixed, restrict CORS to the actual supported app origins and test preview/production origins.
3. **Manual JWT verification:** keep `verify_jwt=false` only while the explicit Auth token validation remains in the handler. If platform JWT verification is ever enabled, test that behavior and remove redundant validation only in a reviewed change.
4. **Error details:** Soundtrack API error text may be returned in the response. Review whether provider error details should be redacted before broad release.
5. **Secret inventory:** required secret names are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SOUNDTRACK_API_TOKEN`, `SOUNDTRACK_SOUND_ZONE_ID`. Values were not accessed. Verify presence/configuration securely during owner-controlled release rehearsal.

No source changes or redeployment were made. The archived file is an exact copy, not a modified implementation.

## 3. Recovery and release implication

The music function source is now reproducible from the STURMKOPF branch, closing one Edge Function source-archive gap. Full project recovery still requires secure configuration/secret recovery and supported Auth/DB restore. The function must be updated alongside the membership migration before release; otherwise its active-only check is weaker than the intended approved-membership contract.

## 4. Execution boundary and outcome

Read production function metadata and source only. Did not read secret values, change Edge Function settings, deploy function code, alter Auth, or touch production DB/hosting.

**B35 result:** Production music function source archived byte-for-byte and statically reviewed. Membership approval and CORS refinements remain release tasks. Production remains **NO-GO**.
