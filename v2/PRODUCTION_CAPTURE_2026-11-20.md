# Production capture – SturmKopf Feuer 1.1

**Captured:** 2026-11-20  
**Working branch:** `garasjegym-2.0-sturm­kopf`  
**Production project:** `kultdmklwmilhoytrrig` (Garasjegym, eu-west-2)  
**Test project:** `izwzwvlexqxqewzijhhd` (garasjegym-2-test, eu-north-1)  
**Purpose:** Phase A evidence record before building a production-only forward migration set.

## 1. Live project health and platform

Both Supabase projects currently report `ACTIVE_HEALTHY`.

| Evidence | Production | Test |
|---|---:|---:|
| PostgreSQL | 17.11.0.019 | 17.12.0.000 |
| Public base tables | 18 | 46 |
| Public tables with RLS enabled | 18/18 | 46/46 |
| Registered migrations | 11 | 163 |
| Health Advisor lints | 0 | 0 |

Production and test are separate projects in different regions. Test is not a production backup or a safe substitute for a production restore.

## 2. Production schema inventory

Production public tables currently present:

- class_bookings
- classes
- exercises
- member_preferences
- personal_records
- profiles
- pt_bookings
- pt_client_notes
- pt_messages
- pt_requests
- pt_session_exercises
- pt_sessions
- social_comments
- social_posts
- wods
- workout_exercises
- workout_logs
- workout_sets

The test schema has 28 additional public tables:

- calendar_events
- challenge_participants
- challenges
- class_live_sessions
- class_session_wod_completions
- coffee_order_items
- coffee_orders
- coffee_product_reviews
- coffee_products
- coffee_settings
- daily_wod
- exercise_favorites
- notifications
- pt_checkins
- pt_client_assignments
- pt_client_goals
- pt_coaches
- pt_intakes
- pt_program_sessions
- pt_program_templates
- pt_programs
- pt_service_requests
- pt_services
- pt_wod_assignments
- training_session_wods
- training_sessions
- wod_daily_schedules
- wod_favorites

This is a table-presence comparison only. It is not an approved migration script.

## 3. Object-level drift that must be reconciled

Latest documented production/test comparison:

| Object type | Production | Test | Difference requiring review |
|---|---:|---:|---:|
| Public columns | 173 | 502 | 329 test-only; 2 changed |
| RLS policies | 49 | 129 | 83 test-only; 3 production-only; 8 changed |
| Indexes | 38 | 170 | 133 test-only; 1 production-only |
| Constraints | 70 | 223 | 153 test-only; 1 changed |
| Triggers | 6 | 25 | 20 test-only; 1 production-only |
| Public functions | 8 | 42 | 34 test-only; 3 changed |
| Public views | 1 | 1 | 1 changed definition |

Known high-risk differences on existing production tables:

- `exercises.body_area`: nullable in production; NOT NULL with a default in test.
- `workout_logs.result_data`: NOT NULL with default in production; nullable in test. Preserve compatibility with historical rows and all application insert/update paths.
- `class_bookings.status`: production check constraint does not allow `waitlist`; test does.
- Booking capacity, waitlist promotion, notification triggers, and booking policies differ.
- `handle_new_auth_user()`, `is_active_user()`, and `check_class_booking_capacity()` differ. Preserve the test membership-approval gate semantics; do not weaken signup or membership activation.
- Production has legacy policies on member_preferences and pt_bookings that need explicit reconciliation, not blind deletion.
- Production has a unique partial index for active class bookings whose semantics differ from the test replacement. Validate current rows and concurrency behavior before replacing it.

Live HR preferences are not yet present in production. The four HR preference columns must be introduced with safe defaults (false) only after the app's fallback behavior and row-preservation are verified.

## 4. Production migration history

Production currently records exactly these 11 versions:

- 20261116213905 lock_down_manager_profile_updates
- 20261116214010 restrict_trigger_function_execution
- 20261116214020 restrict_anon_security_definer_rpc
- 20261117191749 workout_result_scoring_fields
- 20261117210956 align_workout_log_result_data
- 20261118184920 wod_timer_settings_and_exercise_metadata
- 20261118194052 exercise_prescription_profiles
- 20261119223903 revoke_anon_security_definer_execute
- 20261119224030 harden_production_security_definer_paths
- 20261120214242 secure_pt_session_capacity
- 20261120214355 revoke_anon_public_table_access

The V2 test history is now fully represented by the 163 SQL files in `v2/supabase/migrations` by version; there are zero installed test versions without a matching file and zero V2 SQL files absent from the test ledger. This supersedes older QA notes that reported 15 missing files and four uninstalled files. The test history is still not a valid sequence to replay in production: it contains a test-only baseline and seed migration, while production has a separate 11-version history. None of the 11 production versions is represented in the V2 migration directory. See [MIGRATION_RECONCILIATION_2026-11-20.md](./MIGRATION_RECONCILIATION_2026-11-20.md). Never reset the test database or replay its full history against production as a shortcut.

## 5. Security evidence

Production Security Advisor currently reports:

- Four authenticated SECURITY DEFINER function warnings: `book_pt_session`, `is_active_user`, `is_admin`, `is_admin_or_manager`. These are reviewed entry points; retain only with explicit authorization checks and grants.
- Leaked Password Protection is disabled.
- Health Advisor reports no lints.
- The earlier hardening is present: all 18 public tables have RLS enabled; no direct anon table grants were reported in the latest production hardening verification; the PT capacity view uses a SECURITY INVOKER implementation with a private helper.

Test Security Advisor currently reports 25 authenticated SECURITY DEFINER function warnings and Leaked Password Protection disabled. These must be reviewed function-by-function. Do not mechanically convert atomic RPCs to SECURITY INVOKER or remove EXECUTE grants without checking application call paths.

## 6. Deployment evidence

The STURMKOPF verification workflow on commit `dd6a48791a28f4fd2ea16f7659bd3fa5d71cb962` passed all 19 steps, including migration checks, automated tests and Vite production build.

The preview Pages workflow built and uploaded its artifact successfully. Its deploy job was skipped by design. The workflow currently hardcodes the TEST Supabase project URL and publishable key. It is a preview workflow, not a production workflow. Do not enable its deploy job as a production release mechanism.

## 7. Backup and recovery gate – not yet evidenced

The available connected Supabase actions can inspect project health, schema, migrations and advisors, but do not expose a reliable backup/PITR inventory or create a recoverable backup in this workflow.

Therefore the following are **not confirmed** by this capture:

- Current production backup/PITR entitlement and retention window.
- Timestamp and completion status of the latest recoverable production backup.
- A restore rehearsal to an isolated project.
- A named recovery operator and documented restore decision.

Before any production DDL, the owner/operator must verify backup/PITR in Supabase Dashboard, create or confirm a fresh recoverable restore point, and record its timestamp and retention. A test project is not a backup. No production schema migration is authorized by this evidence record.

## 8. Phase A result

**PARTIALLY COMPLETE – HOLD FOR BACKUP EVIDENCE.**

Completed:
- Both project identities, regions, health and PostgreSQL versions checked.
- Production and test migration histories re-read.
- Production table inventory and RLS status rechecked.
- Security and health advisors re-read.
- Current preview workflow and latest CI evidence inspected.
- Known schema and migration drift documented.

Outstanding:
- Verify production backup/PITR and record a fresh restore point.
- Obtain a fresh production schema dump/snapshot suitable for a restore rehearsal.
- Archive or reconstruct the SQL source for the 11 production-applied migration versions.
- Produce a production-derived object-by-object delta and reviewed forward-only migrations.
- Rehearse on a fresh production restore before any production migration.

**Release status remains NO-GO.** No application deployment, test-data copy, bulk migration, or schema change was performed in this phase.
