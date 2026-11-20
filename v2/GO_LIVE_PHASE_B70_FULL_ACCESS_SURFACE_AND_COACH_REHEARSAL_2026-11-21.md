# B70 – Full access-surface delta and Wave 2 coach rehearsal
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch: garasjegym-2.0-sturm­kopf
Production project: kultdmklwmilhoytrrig
TEST project: izwzwvlexqxqewzijhhd

## Latest CI – passed
Commit: cb9a955a4734ebb1fb6a1828fc35844c10152e93
Run: 44838267316 (GarasjeGym 2.0 checks)
- Build, automated tests, TEST bundle and artifact environment/secrets checks: success.
- Disposable PostgreSQL 17 fixture: success.
- Wave 1 membership/Auth candidate plus Wave 2 privacy candidate and negative/positive authorization assertions: success.
- Preview is a preview build, not a production deployment.

The Wave 2 fixture now tests all of these distinct boundaries:
1. Member A cannot read member B's confirmed class booking.
2. Member A cannot read member B's published client-linked PT session.
3. Member A can read the public unassigned published PT slot.
4. Member A can read their own booked private PT session.
5. A registered active coach can read the public slot and only the client-linked PT session for their active assigned client.
6. Admin can read all fixture bookings and sessions.

The coach helper mirrors the repository's assigned-coach rule: active assignment, active coach registration, and both coach and client profiles active and approved. This is a disposable PostgreSQL fixture, not a full Supabase restore.

## Read-only live schema surface comparison
| Object | Production | TEST |
|---|---:|---:|
| Public base tables | 18 | 46 |
| Constraints | 70 | 226 |
| Indexes | 38 | 181 |
| Non-internal public triggers | 6 | 44 |
| Public functions | 8 | 75 |
| app_private functions | 0 | 2 |
| Public RLS policies | 49 | 144 |
| RLS-enabled public tables | 18 | 46 |

The count deltas are material. Production has no app_private functions; TEST includes the assigned-coach and own-booked-session authorization helpers.

## Tables present in TEST but absent from production
calendar_events, challenge_participants, challenges, class_live_sessions, class_session_wod_completions, coffee_order_items, coffee_orders, coffee_product_reviews, coffee_products, coffee_settings, daily_wod, exercise_favorites, notifications, pt_checkins, pt_client_assignments, pt_client_goals, pt_coaches, pt_intakes, pt_program_sessions, pt_program_templates, pt_programs, pt_service_requests, pt_services, pt_wod_assignments, training_session_wods, training_sessions, wod_daily_schedules, wod_favorites.

## Release blockers still open
- Production schema is not a complete match for the current app contract. App-referenced tables, columns, RPCs, triggers and related policies remain missing.
- Production profile schema still lacks the membership lifecycle columns used by current app code. The current production signup trigger still creates active profiles without the TEST approval gate.
- Production currently has the known broad class-booking SELECT policy and broad published PT-session visibility policy. The candidates are not applied to production.
- The Wave 2 candidate requires pt_bookings, pt_coaches, pt_client_assignments and the membership columns; it is a policy repair candidate, not a replacement for the complete schema rollout.
- No owner-controlled encrypted database backup, Auth/Storage/function backup, or isolated full restore has been verified.
- No replacement/bootstrap admin login has been tested. Do not remove the existing admin identity.
- Clean-start deletion has not been performed. Preserve the 56 standard exercise catalogue rows and safe system configuration.

## Actions explicitly not performed
No production DDL/DML, migrations, policy/grant changes, Auth changes, deletes/truncates, Edge Function deployment, merge/rebase, or production deploy. No secrets or backups were copied into the repository.

## Next required release sequence
1. Recover/reconcile the exact production migration lineage and create a complete ordered schema delta.
2. Build a disposable full-production-shaped Supabase restore, not just the minimal PostgreSQL fixture.
3. Rehearse all schema, RLS, grants, RPC, trigger, Storage and Edge Function changes together, including cross-member and assigned-coach negative tests.
4. Owner-run encrypted backup and successful isolated restore of database plus Auth/Storage/function configuration.
5. Verify bootstrap admin login and approval/invitation lifecycle.
6. Only then schedule the approved clean-start data reset, retain exercise catalogue/system config, apply the full schema and policy rollout, verify smoke tests, and deploy production.

Status: CI and focused privacy rehearsal green; production release remains NO-GO.
