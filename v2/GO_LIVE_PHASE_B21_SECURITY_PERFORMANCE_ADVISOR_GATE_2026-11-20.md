# GO LIVE Phase B21 – fresh production security and performance advisor gate

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** NO NEW SECURITY REGRESSION DETECTED; EXISTING FINDINGS REQUIRE TRIAGE

## 1. Fresh production advisor results

Production project `kultdmklwmilhoytrrig` was queried read-only at approximately 22:14 UTC.

### Security findings

| Finding | Count | Severity |
|---|---:|---|
| Authenticated callers can execute SECURITY DEFINER functions | 4 | WARN |
| Leaked password protection disabled | 1 | WARN |

The four functions are:
- `book_pt_session(uuid)`
- `is_active_user()`
- `is_admin()`
- `is_admin_or_manager()`

These functions were previously reviewed as intentional application helpers with fixed search paths. The advisor warning does not by itself prove an exploitable issue. Each function still requires caller-role tests and an explicit grant allowlist. Do not blanket revoke authenticated EXECUTE or convert all helpers to SECURITY INVOKER; that can break app workflows or RLS predicates.

Leaked-password protection remains disabled. Enable only after the owner confirms the desired password/recovery policy and user impact. No Auth settings were changed.

### Performance findings

| Finding | Count | Severity |
|---|---:|---|
| Unindexed foreign keys | 14 | INFO |
| Auth RLS initialization plan | 34 | WARN |
| Unused indexes | 10 | INFO |
| Multiple permissive policies | 3 | WARN |

The three multiple-permissive-policy tables are `exercises`, `pt_session_exercises` and `wods`. Policies must be reviewed as a combined OR set, with role-by-role access tests, before any consolidation. RLS init-plan findings should be optimized only where semantics remain identical. Unused indexes should not be dropped based on advisor output alone, particularly on a small/low-traffic database.

## 2. Test environment comparison

Test project `izwzwvlexqxqewzijhhd`:
- 25 authenticated SECURITY DEFINER warnings.
- Leaked password protection disabled.
- 47 unused-index findings.

The test schema is substantially larger than production, so these counts are not directly comparable. Test advisor findings are not a reason to copy policies/grants to production.

## 3. Recommended remediation order

1. Produce a function-by-function allowlist for the four production SECURITY DEFINER functions, including expected caller roles and positive/negative tests.
2. Review the three production tables with multiple permissive policies and prove intended effective access for anon, member, manager and admin.
3. Optimize RLS init plans in isolated test first; preserve exact authorization behavior.
4. Add indexes for 14 foreign keys only after workload and duplicate-index checks.
5. Review unused indexes after meaningful workload observation; do not drop speculatively.
6. Confirm password/recovery policy with owner before enabling leaked-password protection.

## 4. Execution boundary

All checks were read-only. No grants, functions, policies, indexes, Auth settings or application code were changed in this phase.

**B21 result:** Production findings remain at 4 SECURITY DEFINER warnings, 1 leaked-password warning, 14 unindexed FKs, 34 RLS init-plan warnings and 3 multiple-permissive-policy warnings. No mass changes are safe. Production remains NO-GO until Wave 0 recovery and migration compatibility gates pass.
