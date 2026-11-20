# GO LIVE Phase B38 – production security/performance advisor revalidation

**Date:** 2026-11-20  
**Release:** STURMKOPF FEUER 1.1  
**Scope:** fresh read-only Supabase advisors  
**Decision:** NO NEW CRITICAL HEALTH FINDING; SECURITY HARDENING ITEMS REMAIN OPEN

## 1. Security advisor – production

Fresh production security advisor at 2026-11-20 22:36 UTC:
- 4 authenticated-callable SECURITY DEFINER warnings: `book_pt_session(uuid)`, `is_active_user()`, `is_admin()`, `is_admin_or_manager()`.
- 1 Auth warning: leaked-password protection is disabled.

The four functions were individually inspected in B29. They have fixed search_path, require caller identity/active role checks and implement the intended member/staff helper or booking behavior. The advisor warning is not evidence of an anonymous bypass; do not blindly revoke authenticated EXECUTE or change them to SECURITY INVOKER. Keep the allowlist and role-based tests in the release package.

Leaked-password protection remains a real Auth hardening task. Enable it only after Wave 0 recovery and then verify signup/password-change behavior. No Auth configuration change was made.

## 2. Performance advisor – production

Fresh findings:
- 14 unindexed foreign keys.
- 34 RLS initplan warnings.
- 10 unused indexes.
- 3 tables flagged for multiple permissive policies.

These are INFO/WARN performance observations, not current health failures. No blanket index drops, RLS rewrites or policy consolidation were applied. The RLS policy audit in B34 confirms the current audience is authenticated-only. Review individual index and policy candidates on the restored production copy with query plans and behavioral tests before any migration.

## 3. Health advisor

No health advisor lints were returned.

## 4. Interpretation and execution boundary

The advisor snapshot is consistent with B29: no newly observed SECURITY DEFINER warning class or health issue, but leaked-password protection remains disabled and performance debt remains. The advisor is not a substitute for role-isolation testing or backup/restore proof.

Only read-only advisor endpoints were queried. No production database, Auth configuration, policies, indexes, functions, Edge Functions, secrets, hosting or paid resources were changed.

**B38 result:** Production advisor state revalidated. No new health lint; existing security and performance items remain tracked. Wave 0 and production release remain **NO-GO**.
