# GO LIVE Phase B3 – app-to-production dependency audit

**Date:** 2026-11-20  
**Status:** NO-GO – read-only audit only; no production or test writes  
**Scope:** STURMKOPF 2.0 frontend code paths versus live production schema and the B2 catalog comparison.

## Executive result

The current STURMKOPF frontend is not compatible with the live production schema as it stands. The most immediate blocker is the authentication/profile bootstrap:

- `v2/src/lib/auth.js` selects `id, display_name, role, active, avatar_url, email, membership_status` from `profiles`.
- A fresh read-only query of production `information_schema.columns` confirms that `profiles` has only `id, display_name, avatar_url, role, active, created_at, updated_at`. It has neither `email` nor `membership_status`.
- `v2/src/App.jsx` gates the app on the fetched profile and branches on `membership_status === 'pending'` / `'rejected'`; it also requires approved membership for PT coach discovery.
- Therefore a frontend-only release against the current production schema can fail during profile loading, before a user can reach the application. This is a release blocker, not a cosmetic difference.

Do not solve this by blindly adding columns with permissive defaults. Existing account states, administrator access, and the Auth profile trigger must be reconciled and backfilled deliberately.

## Verified frontend call paths

### Authentication and membership

- `lib/auth.js:fetchMemberProfile()` reads the missing `profiles.email` and `profiles.membership_status` columns.
- `App.jsx` uses `membership_status` to hold pending applicants outside the app and reject denied/inactive accounts.
- `App.jsx` reads `pt_coaches` only for active, approved non-staff users.
- The production trigger `handle_new_auth_user()` differs from test: production currently creates a normal active member; test creates an inactive, pending member. This is a critical policy decision. Do not deploy the test trigger until there is a confirmed approval and admin bootstrap/recovery plan.
- `Admin.jsx` reads and updates membership status, active state and roles; the admin UI expects pending/rejected/approved membership states.

### Group classes and booking

- `Booking.jsx` calls `book_class`, `cancel_class`, `get_class_attendance_counts`, and `publish_class_session_results`, and reads/writes `classes`, `class_bookings`, `class_live_sessions`, `class_session_wod_completions`, `calendar_events`, and related profile/WOD/log data.
- Production has `classes` and `class_bookings`, but B2 confirms that `class_live_sessions` and `class_session_wod_completions` are test-only tables. The broader test-only inventory also includes `calendar_events`.
- Production `class_bookings.status` does not permit `waitlist`; test does. The booking capacity trigger/function differs. The test version adds row locking and waitlist eligibility checks. Do not enable waitlist UI or deploy the test trigger/function until the table constraint, policies, race behavior, and cancellation/promotion path are migrated together.
- The frontend booking path uses RPC `book_class`; the changed trigger `check_class_booking_capacity()` is part of the database-side behavior and must be verified as an integrated transaction, not treated as a standalone function update.

### PT Studio and PT booking

- `PT.jsx` calls `book_pt_session`, `cancel_pt_booking`, `create_pt_session_from_request`, `update_pt_session_details`, and `cancel_pt_session`.
- `PTStudio.jsx` reads `pt_intakes`, `pt_client_goals`, `pt_program_templates`, `pt_programs`, `pt_program_sessions`, `pt_checkins`, and WOD data; it also calls archive/restore/move/reorder PT-program RPCs.
- `PTManagement.jsx` calls `assign_pt_coach`.
- Production contains legacy `pt_sessions` and `pt_bookings`, but the PT Studio programme/intake/goal/check-in tables above are absent from production according to the live table inventory. A production rollout of PT Studio cannot work by deploying the frontend alone.
- B2 confirmed that production and test `book_pt_session` differ: test excludes client-linked private sessions from public booking. The test function must not be deployed independently of the corresponding product rules, RLS and frontend behavior.

### WOD and workout save paths

- `WodBuilder.jsx` calls `save_wod_with_pt_assignment`.
- `Training.jsx` calls `save_workout_with_pt_links` and `record_workout_prs`.
- The WOD/Training flows depend on newer PT assignment/program tables and RPCs that are not present in production's older schema inventory. Production has some newer WOD timer/exercise metadata fields, but that does not imply the full STURMKOPF training workflow is production-ready.

### Member deletion

- `Admin.jsx` invokes Edge Function `admin-delete-user`.
- Production currently has no such Edge Function; test has it, but B2 established that its reference-check list contains tables/columns not present in production.
- Do not deploy the current function unchanged. Its reference map must be rebuilt against the production schema and tested against real FK/history relationships. The UI must continue to prevent self-deletion and deletion of admin accounts; historical data must not be silently orphaned.
- `admin-create-user` returns HTTP 410 by design and the UI says accounts are admin-created. Keep account creation disabled unless the owner explicitly changes that product decision.

## Fresh production column check (read-only)

The query covered `profiles`, `classes`, `class_bookings`, `pt_sessions`, `pt_bookings`, `pt_intakes`, `pt_programs`, `pt_program_sessions`, `pt_checkins`, `wods`, `exercises`, and `workout_logs`.

Confirmed production facts:

- `profiles` has no `email` or `membership_status`.
- Legacy PT tables `pt_sessions` and `pt_bookings` exist.
- STURMKOPF PT programme tables queried (`pt_intakes`, `pt_programs`, `pt_program_sessions`, `pt_checkins`) do not appear in production.
- Production has `classes`, `class_bookings`, `wods`, `exercises`, and `workout_logs`.
- `exercises.body_area` is nullable with no default in production (test differs).
- `workout_logs.result_data` is NOT NULL with default `'{}'::jsonb` in production (test differs).

## Required remediation sequence (not executed)

1. **Auth compatibility design:** define the canonical membership state model; map existing active/inactive and role records; determine email source and sync policy from Supabase Auth; design deterministic backfill; prove at least one admin can still sign in and approve members. Test the exact trigger and RLS behavior in isolation first.
2. **App compatibility gate:** either ship a narrowly scoped compatibility layer that supports the current production profile schema or complete and verify the database migration before shipping frontend. Do not ship the current `fetchMemberProfile` query unchanged against production.
3. **Core booking migration:** reconcile `class_bookings.status`, capacity trigger/function, policies, cancellation and waitlist promotion atomically; include concurrency tests for last-seat contention.
4. **PT Studio migration:** build a production-derived dependency map for all PT programme tables, foreign keys, RLS policies, RPCs and notification side effects. Preserve legacy `pt_sessions`/`pt_bookings` data.
5. **Workout/WOD migration:** map all save/log/PR RPC dependencies and ensure existing `workout_logs` data remains readable and writable.
6. **Delete-user Edge Function:** adapt reference checks to the actual production schema; add integration tests for no-history, linked-history, admin, self-delete, invalid JWT, and database-check failure.
7. **Full release rehearsal:** restore/clone production only after backup/PITR evidence and explicit cost approval if any paid resource is required. Run migrations in a disposable rehearsal, verify row counts and RLS, then execute app smoke tests with member, admin, manager, PT coach and pending/rejected test identities.

## Release decision

**NO-GO remains.** B3 is a read-only audit and did not change either database, Auth configuration, Edge Functions, deployment settings, or production hosting. The next production-changing step is blocked until the owner provides evidence of a recent completed production backup/PITR recovery point and approves the controlled restore rehearsal. No production DDL, Edge Function deployment, or frontend production release has been performed.
