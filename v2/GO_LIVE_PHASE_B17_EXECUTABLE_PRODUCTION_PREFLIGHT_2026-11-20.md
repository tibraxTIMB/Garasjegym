# GO LIVE Phase B17 – executable read-only production preflight

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** PREFLIGHT EXECUTED; PRODUCTION SCHEMA STILL NOT READY

## 1. Deliverable

Added `v2/supabase/preflight/production_wave_preflight_read_only.sql`.

The script is read-only: it inspects required V2 table presence, selected contract columns and RLS enablement. It contains SELECT statements only and is safe to execute against production. It is not a migration and does not create, alter or delete objects.

## 2. Live production result

Executed the same SQL against production project `kultdmklwmilhoytrrig`.

### Present core tables

- `profiles`, `classes`, `class_bookings`
- `pt_sessions`, `pt_bookings`
- `wods`, `exercises`
- `workout_logs`, `workout_exercises`, `workout_sets`
- `personal_records`
- `social_posts`

### Missing V2 integration tables

- PT Studio: `pt_coaches`, `pt_client_assignments`, `pt_intakes`, `pt_client_goals`, `pt_program_templates`, `pt_programs`, `pt_program_sessions`, `pt_checkins`
- Notifications: `notifications`
- Coffee: `coffee_products`, `coffee_orders`, `coffee_order_items`
- Calendar: `calendar_events`
- WOD favorites: `wod_favorites`

### Missing contract columns

- `profiles.email`
- `profiles.membership_status`
- `classes.published`
- `classes.instructor_id`
- `class_bookings.attendance_status`

Present contract column:

- `workout_logs.result_data`

### RLS

All public base tables returned by the query have RLS enabled, including profiles, classes, class bookings, PT legacy tables, social tables, WODs, exercises, workout logs/sets/exercises and PRs.

RLS enabled is only a baseline control; it does not prove policy correctness. Existing role/policy drift findings remain applicable.

## 3. Consequence for migration sequencing

The executable check confirms that V2 membership, class booking/waitlist, PT Studio and optional integration migrations cannot be considered already present in production. Production must be upgraded in ordered, individually rehearsed waves.

The workout core tables exist, but the save/PR RPC contract and constraints still need the detailed B11 compatibility tests. Do not infer full readiness from table presence alone.

## 4. Execution boundary

Only the read-only SQL file was committed to the STURMKOPF branch and the SELECT query was executed against production. No migration was applied; no database, Auth, Edge Function, secret, hosting or member data was changed.

**B17 result:** Production preflight is now reproducible and confirms substantial schema gaps. It is a useful release gate, not permission to deploy. Backup/PITR evidence and isolated restore remain mandatory. Release remains **NO-GO**.
