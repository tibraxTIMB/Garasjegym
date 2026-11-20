# GO LIVE Phase B50 – signup conflict-path preservation test

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Commit tested:** `b3d2b9fcd57a00c7c2ef0fa7c62d02a822d66020`  
**Decision:** SIGNUP CONFLICT-PATH ASSERTION PASSED IN POSTGRESQL 17.12

## 1. Additional risk closed in the disposable harness

The Wave 1 signup trigger has a deliberate `ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email` path. This is intended to synchronize the Auth email without overwriting existing profile decisions.

Added a disposable trigger probe in `wave1_candidate_postgres17_assertions.sql`:
- A temporary table invokes the exact `public.handle_new_auth_user()` trigger function with an existing profile UUID.
- The incoming event has a different email and a different display name.
- The assertion verifies only email changes; existing display name, role, active flag and approved membership remain unchanged.

**Result:** PASS. The test would fail if the trigger overwrote any protected profile field.

## 2. CI evidence

On commit `b3d2b9fcd57a00c7c2ef0fa7c62d02a822d66020`:
- Full GarasjeGym 2.0 checks: SUCCESS (run 44832920483), including the disposable PostgreSQL 17 candidate rehearsal.
- PostgreSQL candidate job: SUCCESS; log contains `WAVE1_POSTGRES17_CANDIDATE_TESTS_PASSED`.
- STURMKOPF build/focused tests: SUCCESS (run 44832920459).

The Postgres test runs in a disposable GitHub Actions service container and is destroyed after the workflow. It does not connect to production or Supabase TEST.

## 3. Remaining boundary

This is still a PostgreSQL fixture, not an actual Supabase project restore. It does not validate managed Auth service migration, production UUID restore, real JWT/PostgREST behavior, Supabase grants/cache or Edge Function deployment. The exact candidate still requires a verified isolated production restore and the full Wave 1 smoke matrix.

No production or TEST database changes, Auth exports, Edge Function deployments, secret changes, hosting publication or paid Supabase resources were used.

**B50 result:** The signup trigger's existing-profile conflict path now has an explicit regression assertion and passes PostgreSQL 17.12. Wave 0 remains blocked; production remains **NO-GO**.
