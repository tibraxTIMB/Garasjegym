# B68 – Production policy coverage and release rehearsal gap
Date: 2026-11-21
Branch: garasjegym-2.0-sturm­kopf
Base examined: production project kultdmklwmilhoytrrig; isolated TEST project izwzwvlexqxqewzijhhd
Production writes: none.

## CI recheck
Workflow run 44837318451 was rechecked after the prior status snapshot.
- Job "build": completed successfully.
- Install dependencies, SQL migration delimiter check, automated tests, isolated TEST bundle build, and built artifact environment/secrets check: all completed successfully.
- Job "Disposable PostgreSQL 17 Wave 1 candidate rehearsal": completed with conclusion "skipped". This is not a successful rehearsal and does not validate applying a candidate migration to PostgreSQL 17.

## Current policy inventory
Read-only query of pg_policies:
- Production: 49 policies over 18 public tables; all 49 permissive, zero restrictive.
- TEST: 144 policies over 46 public tables; all 144 permissive, zero restrictive.
The policy counts alone are not a proof of policy equivalence. Production has fewer tables and policies, and policy expression review plus negative cross-member authorization tests remain release gates.

## Confirmed critical production policy defects (from B64, revalidated against current production policy expressions)
1. class_bookings_read_own_or_staff permits any active user to read every confirmed booking due to the broad branch is_active_user() AND status='confirmed'. This is cross-member booking visibility.
2. pt_sessions_read permits any active user to read every published PT session, including client-linked sessions belonging to another member.
These are privacy defects. Do not release with these rules. A correction must preserve intended public class/session visibility while excluding another member's private booking and client-linked PT data.

## Additional compatibility constraints
B61/B62/B63 remain applicable:
- Production currently has only 18 public base tables vs 46 in TEST.
- The app references numerous tables and RPCs absent from production.
- Shared tables have material column drift; profiles lacks email and membership_status required by current app and the TEST membership gate.
- Production Auth trigger and is_active_user() do not enforce the TEST membership approval lifecycle.
- Current admin-create-user function source is disabled (HTTP 410); production has no deployed replacement for the TEST-only admin user functions.
A data-only clean-start reset cannot resolve these schema/runtime contract gaps.

## Required next gates
1. Build a production-targeted schema manifest and migration chain from verified production lineage; do not replay TEST bootstrap/seed/baseline migrations.
2. Add a real disposable PostgreSQL 17 rehearsal job to CI and ensure it runs (not skipped). Test clean install, migration order, constraints, triggers, grants, RLS and RPC contract.
3. Fix the two privacy policies and complete policy-by-policy expression comparison, with negative tests for member A attempting to read member B's bookings, client PT sessions, notes and messages.
4. Complete all missing production tables/columns/RPCs and membership/bootstrap lifecycle before any app deployment.
5. Owner-run encrypted backup and isolated restore rehearsal, including separate Auth, Storage and Edge Function recovery plan.
6. Verify secure one-admin bootstrap and login before any account cleanup. Then perform the explicitly approved operational data reset under a separately rehearsed, owner-controlled runbook.
7. Only after all gates pass: deploy schema, verify runtime, deploy app, then execute the clean-start reset and post-deploy smoke tests.

## Change boundary
No production DDL/DML, policy/grant changes, Auth changes, Edge Function deployment, data deletion, merge/rebase, or production deploy was performed. The production database remains unchanged by this phase.
