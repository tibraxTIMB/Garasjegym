# SturmKopf Feuer 1.1 – production schema and migration gate audit

Date: 2026-11-21  
Repository: `tibraxTIMB/Garasjegym`  
Working branch: `garasjegym-2.0-sturm­kopf`  
Latest audited working commit before this report update: `92a90509d9dbdbce08facf7dec8a07aed4661928`

## Decision

**NO-GO for production deployment.** No production database writes, production migration, merge, or deployment were performed during this audit.

The production and test projects are separate Supabase projects:
- Production: `kultdmklwmilhoytrrig` (`Garasjegym`, eu-west-2)
- Test: `izwzwvlexqxqewzijhhd` (`garasjegym-2-test`, eu-north-1)

Both projects currently report `ACTIVE_HEALTHY`. They run different Postgres minor versions (17.11 vs 17.12).

## Live schema comparison

Read-only queries against `information_schema` found:

| Object | Production | Test |
|---|---:|---:|
| Public base tables | 18 | 46 |
| Public views | 1 | 1 |
| Public tables + views | 19 | 47 |

The test schema contains 28 base tables that do not exist in production:

`calendar_events`, `challenge_participants`, `challenges`, `class_live_sessions`, `class_session_wod_completions`, `coffee_order_items`, `coffee_orders`, `coffee_product_reviews`, `coffee_products`, `coffee_settings`, `daily_wod`, `exercise_favorites`, `notifications`, `pt_checkins`, `pt_client_assignments`, `pt_client_goals`, `pt_coaches`, `pt_intakes`, `pt_program_sessions`, `pt_program_templates`, `pt_programs`, `pt_service_requests`, `pt_services`, `pt_wod_assignments`, `training_session_wods`, `training_sessions`, `wod_daily_schedules`, `wod_favorites`.

Ten shared tables have additional columns in test (35 columns total):

| Table | Test-only columns |
|---|---|
| `class_bookings` | `attendance_status`, `attendance_marked_at`, `attendance_marked_by` |
| `classes` | `instructor_id`, `published`, `cancelled_at`, `cancelled_by`, `cancellation_note`, `prep_text`, `main_text`, `finish_text`, `coach_notes` |
| `member_preferences` | `created_at`, `last_seen_pt_wod_at`, `spotify_genre_playlists`, `hr_enabled`, `hr_share_with_pt`, `hr_share_on_screen`, `hr_save_history` |
| `profiles` | `email`, `membership_status`, `member_rank` |
| `pt_requests` | `archived_at`, `pt_session_id` |
| `pt_sessions` | `session_type`, `coach_notes`, `completed_notes`, `attendance_status`, `cancellation_note` |
| `social_posts` | `author_role` |
| `wods` | `is_archived`, `category` |
| `workout_logs` | `class_live_session_id`, `save_token` |
| `workout_sets` | `height_cm` |

No production-only base table or production-only column was identified in the shared-table comparison. This is a schema inventory, not proof that every test migration is safe to apply to production.

## Migration history – do not replay blindly

The test project reports 164 migration records after the isolated `add_member_rank_to_profiles` migration. Production reports 11. Their version histories do not align: none of the test migration versions currently match the production migration ledger.

The test migration folder includes at least three explicitly test-only files:
- `20261116225942_baseline_from_production_schema_no_data.sql`
- `20261116230108_test_seed_data.sql`
- `20261117090304_test_first_signup_admin_bootstrap.sql`

These must never be applied to production. The baseline is not a production upgrade migration, seed rows are not production data, and the first-signup-admin bootstrap is test-specific.

A production migration plan must be reconstructed from the actual production schema and reviewed migration-by-migration. Do not run all 163/164 test migrations against production, and do not treat the migration-count difference as a direct pending-migrations count.

## Security and data-integrity observations

- RLS is enabled on all 18 production base tables and all 46 test base tables.
- The test security advisor previously reported 25 authenticated-executable SECURITY DEFINER functions. Current catalog count: 49 SECURITY DEFINER functions, 25 executable by `authenticated`, 0 executable by `anon`; all 49 have explicit search_path settings. Function-by-function review is still required; do not revoke helper grants indiscriminately.
- Production catalog count: 7 SECURITY DEFINER functions, 4 executable by `authenticated`, 0 by `anon`; all have explicit search_path settings.
- Production leaked-password protection remains reported disabled by the Supabase security advisor.
- Test data integrity checks found no duplicate class/PT booking pairs, capacity overruns, PR-to-wrong-member links, or orphan notifications in the checked conditions.
- One historical completed PT WOD assignment has no workout-log link. It was not modified.
- Test storage inventory and production storage inventory were read; no backup artifact or restore test was produced.

## Changes made on the isolated working branch

1. Added `20261120230300_add_member_rank_to_profiles.sql` and applied it only to the test project. The filename now matches the migration version recorded by the test project's migration ledger. It adds an optional text column with a 40-character limit. Production remains unchanged.
2. Added `scripts/check-production-migrations.mjs`, which blocks files with test-only naming or an explicit `TEST ONLY` header.
3. Added `scripts/production-migrations.test.mjs` with tests for safe files, test-only filenames, and test-only headers.
4. Exposed `npm run check:production-migrations` and included `test:production-migrations` in the aggregate `npm test` script.

These files have been committed on the isolated branch. The three new preflight unit tests were executed in a local Node.js fixture using the exact committed test and preflight source: 3 passed, 0 failed. This is not a substitute for running the full repository suite. A GitHub Actions workflow (`.github/workflows/sturm-kopf-ci.yml`) now runs app tests, migration checks, and the production build, with a separate production migration safety gate. No completed CI run has yet been verified. The preflight is expected to fail on the current mixed migration folder until test-only migrations are separated from the production migration path. That is an intentional release block.

## Required next gates

1. Run `npm install`, `npm test`, `npm run build`, `npm run check:migrations`, and the production migration preflight in a real checkout of this exact branch/commit. No npm lockfile currently exists in the repository, so `npm ci` is not available and dependency resolution is not yet locked.
2. Split test-only baseline, seed, and bootstrap SQL from the production migration path; add a guard test proving they cannot enter the production deployment artifact.
3. Build a production-specific migration plan for the 28 tables and 35 columns, including RLS, grants, indexes, triggers, functions, views, storage policies, and data backfill/compatibility.
4. Obtain an external backup and prove a restore to a separate disposable project before production writes.
5. Complete authenticated role-by-role regression tests and Android/tablet acceptance tests.
6. Only after all gates pass, request explicit approval for production deployment.

**No production action is authorized by this audit.**
