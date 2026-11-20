# GO LIVE Phase B13 – live Auth/RPC security gate

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** SECURITY FINDINGS RECONCILED; AUTH CONFIGURATION CHANGE BLOCKED PENDING APPROVAL/REHEARSAL

## 1. Fresh live Security Advisor results

Read-only Security Advisor checks at 2026-11-20 22:08 UTC:

| Finding | Production | Test |
|---|---:|---:|
| Authenticated SECURITY DEFINER RPC warnings | 4 | 25 |
| Leaked Password Protection disabled | 1 | 1 |

Production's four callable SECURITY DEFINER functions are:

- `book_pt_session(uuid)`
- `is_active_user()`
- `is_admin()`
- `is_admin_or_manager()`

The current production audit previously verified no anon EXECUTE on public SECURITY DEFINER functions and fixed search_path on the public SECURITY DEFINER functions. These four authenticated-callable functions are not automatically vulnerabilities; each needs a reviewed authorization contract, explicit grants and role tests. In particular, booking RPCs and identity helper functions must not be mechanically converted to invoker mode without validating RLS and transaction behavior.

The test project has 25 authenticated SECURITY DEFINER warnings. They include PT programme lifecycle, class booking/attendance, coffee ordering/reviews, workout PR, infotainment and social reaction RPCs. This is expected to be a larger API surface than production and requires a per-function allowlist before release.

Both environments report Leaked Password Protection disabled.

## 2. Required production security actions

1. Keep the four production RPCs only if their caller identity, role checks, row ownership, fixed search_path and grants pass explicit member/admin tests.
2. Confirm anon and PUBLIC EXECUTE remain revoked for all exposed SECURITY DEFINER functions.
3. Maintain an allowlist for every member-callable SECURITY DEFINER function; remove EXECUTE only when the app call graph confirms it is unused.
4. Do not blanket-change SECURITY DEFINER functions to SECURITY INVOKER. Some functions intentionally perform atomic multi-row operations or serve as authorization helpers.
5. Enable leaked-password protection in production Auth settings only after the owner confirms the user-facing password policy and tests signup, password change, reset and recovery. This is a dashboard/Auth configuration action, not a SQL migration.
6. Repeat the Auth and RPC security checks after any configuration or migration change.

## 3. Remediation reference

Supabase documentation for leaked-password protection:
https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Supabase database linter guidance for authenticated SECURITY DEFINER functions:
https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## 4. Execution boundary

Only live read-only advisor checks were performed. No Auth setting, password policy, RPC grant, function, policy, trigger, secret or deployment was changed.

**B13 result:** Current production security warnings are enumerated and assigned a safe review path. Leaked-password protection remains disabled and must be addressed before release acceptance. Production remains **NO-GO** until recovery evidence, isolated rehearsal, role tests and explicit owner approval are complete.
