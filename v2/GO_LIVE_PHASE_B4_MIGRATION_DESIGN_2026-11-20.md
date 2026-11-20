# GO LIVE Phase B4 – production-derived migration design

**Date:** 2026-11-20  
**Status:** DESIGN ONLY / NO-GO  
**Scope:** Translate B1–B3 evidence into a dependency-ordered migration and rehearsal plan. No SQL has been applied to either database.

## 1. Non-negotiable release controls

- Production project: `kultdmklwmilhoytrrig`; test project: `izwzwvlexqxqewzijhhd`.
- Keep all development on `garasjegym-2.0-sturm­kopf`.
- Never replay the 163-entry test migration history against production.
- Do not create a paid restore project, branch, compute resource, or other billable resource without disclosing cost and receiving explicit approval.
- No production DDL, Auth trigger change, Edge Function deployment, secrets change, or hosting deployment until: (a) completed backup/PITR recovery point is evidenced, (b) restore/rehearsal route and cost are approved, (c) migration package passes rehearsal, and (d) owner gives explicit GO LIVE approval.
- A successful schema query is not proof of recoverability. Record backup timestamp, retention/PITR window, and a tested restore outcome.

## 2. Migration inventory facts

Fresh migration ledger reads show 11 production migrations and 163 test migrations. Their histories are independent. Production's 11 recorded migrations are security hardening and selected WOD/workout schema updates; test contains a test-only baseline plus feature migrations and later hardening. Version overlap is insufficient to make the test chain replayable.

Important source migrations inspected in the working branch:

- `20261117090304_test_first_signup_admin_bootstrap.sql`: test-only initial-admin bootstrap. It is not the final membership policy.
- `20261120124818_20261120180000_require_approved_membership_for_staff_helpers.sql`: staff helper functions require active AND approved membership.
- `20261120205122_reconcile_membership_gate_and_exercise_metadata.sql`: adds `profiles.email` and `membership_status`, backfills email from `auth.users`, defaults existing rows to approved, and changes new signups to inactive/pending. It also changes profile update policy and grants column-level profile select.
- `20261116230002_lock_class_capacity.sql`: serializes class capacity checks and refuses to proceed if duplicate active bookings exist.
- `20261119120415_class_group_waitlist_attendance.sql`: introduces waitlist/attendance columns, constraints, indexes and changes booking/waitlist RPC behavior.
- `20261118222052_pt_studio_2.sql` and `20261119084342_202611190004_pt_coach_registry_and_service_requests.sql`: introduce core PT programme/intake/goal and coach/assignment/service-request domains.

These files are design evidence only. They must be reviewed as a dependency set, not copied and applied as isolated SQL. Later test migrations modify policies, RPCs, constraints, notification side effects and lock ordering.

## 3. Proposed production migration waves

### Wave 0 – recovery and production capture (hard gate)

**Preconditions**
- User supplies the latest completed production backup/PITR timestamp.
- Confirm retention and point-in-time window in the Supabase dashboard.
- Confirm a restore/rehearsal path. If this requires a paid resource, disclose exact estimated cost and obtain explicit approval first.
- Capture production row counts, schema, constraints, indexes, policies, triggers, functions, grants, extensions, Auth user/profile mapping, Edge Function inventory and relevant secrets names (never values).

**Exit criteria**
- Restore has been completed in an isolated environment or an equivalent verified recovery test has been documented.
- Restore timestamp, project, outcome and owner approval are recorded.
- No writes to production during this wave.

### Wave 1 – membership and profile compatibility (highest priority)

**Scope**
- `profiles.email`, `profiles.membership_status`, constraint/index, Auth profile trigger, `is_active_user()`, `is_admin()`, `is_admin_or_manager()`, profile RLS and grants.
- Email synchronization source is `auth.users.email`; define behavior for email changes, nulls, duplicates, and deleted Auth users.
- Inventory current profiles by role/active state and Auth linkage before choosing backfill rules.

**Critical design decision**
- The inspected test migration adds `membership_status NOT NULL DEFAULT 'approved'`, so existing profile rows are initially treated as approved. It then changes new registrations to `active=false, membership_status='pending'`.
- This is safer than automatically activating new signups, but the existing-row backfill must not assume every row is a valid approved member without reviewing current account and role data.
- Test helper functions require active + approved. An administrator whose membership state is not correctly migrated could lose all admin capabilities.
- Do not use the test-only first-signup-admin bootstrap as a production fallback. Decide and document how the existing owner/admin account is preserved and recovered before changing the trigger or helper functions.

**Exit criteria**
- All existing account IDs map correctly to Auth users.
- Owner/admin sign-in and admin approval are tested.
- Pending/rejected/inactive users are blocked as intended.
- New signup is pending/inactive and cannot self-promote.
- Email updates are reconciled safely.
- Profile SELECT/UPDATE grants and RLS are tested for member, manager, admin and pending identities.

### Wave 2 – class booking, capacity, waitlist and attendance

**Scope**
- `class_bookings.status` constraint, unique active-booking index, attendance fields, indexes, policies, capacity trigger, booking/cancel RPCs, waitlist promotion and notifications.
- `class_live_sessions` and `class_session_wod_completions` are dependencies of live group training/results and are absent from production.
- `calendar_events` is a further dependency for calendar workflows.

**Preflight**
- Detect duplicate active bookings before creating the unique index.
- Check all existing status values against the target constraint.
- Verify all foreign keys and RLS policies, including instructor/manager boundaries.
- Ensure cancellation and waitlist promotion are idempotent and lock rows in a consistent order.

**Required tests**
- Last-seat contention with two simultaneous bookings.
- Duplicate booking attempt.
- Full class -> waitlist; cancellation -> exactly one eligible promotion.
- Cancellation after class start does not promote.
- Unpublished/past class cannot be booked.
- Member sees own booking; staff sees permitted attendance only.
- Waitlist and attendance data survive retry and reload.

### Wave 3 – PT Studio foundation and workflows

**Dependency order**
1. PT coach registry, client assignments, services and service requests.
2. PT intakes, goals, program templates and programs.
3. Program sessions, check-ins, session exercise details and workout links.
4. PT booking/session RPCs, coach-specific RLS, notifications, archive/restore/reorder and waitlist behavior.
5. Calendar integration and assigned/private WOD visibility.

**Data protection**
- Production already has legacy `pt_sessions` and `pt_bookings`. Preserve them; do not rename, drop, or repurpose these tables to match the newer programme model.
- Map existing clients, coaches and bookings before creating relationships.
- Do not infer coach assignments from role alone; create explicit, reviewed assignments.
- Test all PT flows for member, assigned coach, unassigned coach, manager and admin.
- Ensure private/client-linked PT sessions are not exposed as public bookable slots.

### Wave 4 – WOD, workout logging, PR and member experience

**Scope**
- WOD assignment/favorites/daily schedules, workout save/linkage RPCs, PR integrity, training-session tables, class result delivery and member preferences.
- Keep production's existing `workout_logs.result_data NOT NULL DEFAULT '{}'` behavior unless a complete code-path review proves a change is necessary. The test schema's nullable definition must not be copied blindly.
- Keep production's nullable `exercises.body_area` behavior unless backfill and all writers are proven safe; the test definition differs.
- Preserve historical WODs, logs, sets and PR relationships.

**Required tests**
- Save ordinary WOD, assigned PT WOD and program-linked workout.
- Retry duplicate submission; no duplicate workout or assignment completion.
- Delete/archive referenced WOD; guard must prevent breaking history.
- PR record creation/update and source-workout integrity.
- Member access boundaries for private WODs and assigned plans.
- Existing production history remains readable and editable.

### Wave 5 – coffee, notifications, social, calendar and optional integrations

Migrate only the modules approved for release. Each module requires its own table/FK/RLS/policy/RPC/trigger/seed audit. Do not allow optional modules to block core training if not included in release scope. Preserve production music integration and review its JWT/secrets configuration separately; do not overwrite production secrets from test.

### Wave 6 – member deletion Edge Function

- Build a production-specific reference inventory from actual foreign keys and business-history relationships.
- The current test `admin-delete-user` implementation is not production-ready because it checks tables/columns absent from production.
- Prefer account deactivation/soft deletion where historical ownership exists.
- Require valid caller JWT, active+approved admin check, no self-delete, no admin-target delete, and fail-closed behavior if any history check cannot complete.
- Test no-history, linked-history, admin target, self target, invalid/expired token, missing environment secret and database-query failure.
- Do not deploy until all checks pass in rehearsal.

## 4. Migration packaging rules

- Produce a fresh, production-derived ordered migration set; do not renumber or replay test ledger entries.
- Each migration must be idempotent where practical, transactional where supported, and include explicit preflight checks for uniqueness, FK and data assumptions.
- Keep data backfills separate from schema changes when that improves reviewability.
- Avoid destructive changes; no table/column/policy/function drops without a documented consumer search, data preservation strategy and rollback.
- Record exact before/after schema hashes, row counts, grants and RLS results.
- Run migrations in a disposable restored copy first; then run application smoke tests against that same restored copy.
- Record migration order, duration, warnings, validation SQL and rollback decision points.

## 5. Rollback and stop conditions

Stop immediately and do not continue later waves if:
- backup/PITR evidence is missing or recovery test fails;
- admin access or membership mapping is uncertain;
- preflight finds duplicate/invalid data not covered by a reviewed cleanup plan;
- any RLS, grant, function, trigger or FK test fails;
- app smoke tests fail for a required role or workflow;
- a migration is partially applied or its state is uncertain;
- costs exceed the approved zero/low-budget plan.

Rollback plan must identify per-wave reverse action, data-loss implications, and whether restoring the recovery point is required. A database restore is the fallback for non-reversible data changes; never promise rollback by simply running a reverse SQL script.

## 6. Current gate and next action

**B4 design is complete; release remains NO-GO.** The next step is Wave 0 evidence gathering and restore rehearsal planning. Required owner input remains the timestamp of the latest completed production backup/PITR recovery point. If no verified recovery point exists, stop here and establish recovery before any production migration work.

No production DDL, data update, Auth change, Edge Function deployment, secrets change, or hosting deployment has been performed in B4.
