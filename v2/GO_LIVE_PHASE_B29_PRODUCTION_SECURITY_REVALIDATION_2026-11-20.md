# GO LIVE Phase B29 – post-recovery-runbook production security revalidation

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Decision:** FOUR SECURITY DEFINER RPCs REVIEWED; NO PRIVILEGE OR AUTH SETTING CHANGES

## 1. Fresh production advisor results

Read-only advisors re-run at approximately 22:25 UTC against production project `kultdmklwmilhoytrrig`.

Security:
- 4 authenticated-callable SECURITY DEFINER warnings.
- 1 Auth warning: leaked password protection disabled.

Performance:
- 14 unindexed foreign keys.
- 34 Auth RLS initialization-plan warnings.
- 10 unused-index findings.
- 3 tables with multiple permissive SELECT policies: `exercises`, `pt_session_exercises`, `wods`.

Health:
- No health advisor findings.

## 2. SECURITY DEFINER function review

Read-only inspection of all four flagged functions confirms:
- All four explicitly set `search_path = pg_catalog, public, pg_temp`.
- All four are not executable by `anon`.
- All four are executable by `authenticated`, which explains the advisor warning.
- `is_active_user()` checks the caller's own profile UUID and requires `active=true`.
- `is_admin()` checks the caller's own profile UUID, `active=true`, and role `admin`.
- `is_admin_or_manager()` checks the caller's own profile UUID, `active=true`, and role in `admin, manager`.
- `book_pt_session(uuid)` requires an authenticated active user, locks the selected published future session, prevents duplicate active bookings, calculates capacity/waitlist status and inserts the booking for `auth.uid()`.

No evidence in this focused review justifies blanket revocation or switching these functions to SECURITY INVOKER. Such a change could break RLS policies and booking flows. Keep their authenticated grants and SECURITY DEFINER behavior under explicit review and regression testing.

## 3. Remaining hardening / performance items

- Leaked password protection remains disabled. It should be enabled after backup/recovery readiness and a planned Auth regression test; no Auth setting was changed here.
- The 14 missing FK indexes and 34 RLS initplan warnings are performance advisories. Evaluate in small, measured migrations after the recovery gate; do not blindly add/drop indexes or rewrite policy semantics.
- The 10 unused indexes are not safe to drop based on current small production traffic.
- The three multiple-permissive-policy findings require policy-combination review with tests, not automatic consolidation.

Remediation references:
- [SECURITY DEFINER callable by authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [RLS initplan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
- [Unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)

## 4. Execution boundary

Only advisor reads and SELECT inspection of four function definitions/grants were executed. No production DDL/DML, grants, function replacement, policy/index change, Auth setting change, Edge Function change, secret access or deployment was performed.

**B29 result:** The four flagged SECURITY DEFINER functions have fixed search paths, deny anon execution and enforce caller-specific active/role checks. Advisor warnings are understood, not silently suppressed. Leaked-password protection remains a genuine hardening item. Production remains **NO-GO** pending Wave 0 recovery.
