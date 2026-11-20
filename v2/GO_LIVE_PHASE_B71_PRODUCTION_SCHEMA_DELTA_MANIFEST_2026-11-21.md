# B71 – Production schema delta manifest (read-only)
Date: 2026-11-21
Release target: SturmKopf Feuer 1.1
Repository: tibraxTIMB/Garasjegym
Branch: garasjegym-2.0-sturm­kopf
Production Supabase: kultdmklwmilhoytrrig
TEST Supabase: izwzwvlexqxqewzijhhd

## Method
Read-only comparison of live `information_schema.columns`, `information_schema.tables`, `pg_constraint`, `pg_trigger`, `pg_proc` and `pg_policies` inventories in Production and TEST. No DDL/DML, grants, Auth or storage changes were made.

## Confirmed schema surface
- Production: 18 public base tables, 173 public columns, 70 constraints, 38 indexes, 6 non-internal public triggers, 8 public functions, 0 app_private functions, 49 RLS policies across 18 RLS-enabled tables.
- TEST: 46 public base tables, 509 public columns, 226 constraints, 181 indexes, 44 non-internal public triggers, 75 public functions, 2 app_private functions, 144 RLS policies across 46 RLS-enabled tables.
- TEST contains all production base tables; Production has no base table absent from TEST.
- There are 28 TEST base tables entirely absent from Production.
- Across 19 shared information_schema table objects (18 base tables plus pt_session_capacity view), 31 TEST columns are absent from Production.
- Total column surface delta: 336 TEST columns absent from Production (305 columns in the 28 absent tables plus 31 columns in shared objects).

## Missing shared-object columns
### class_bookings
- attendance_status text NULL
- attendance_marked_at timestamptz NULL
- attendance_marked_by uuid NULL

### classes
- instructor_id uuid NULL
- published boolean NOT NULL DEFAULT true
- cancelled_at timestamptz NULL
- cancelled_by uuid NULL
- cancellation_note text NULL
- prep_text text NOT NULL DEFAULT ''
- main_text text NOT NULL DEFAULT ''
- finish_text text NOT NULL DEFAULT ''
- coach_notes text NOT NULL DEFAULT ''

### member_preferences
- created_at timestamptz NOT NULL DEFAULT now()
- last_seen_pt_wod_at timestamptz NULL
- spotify_genre_playlists jsonb NOT NULL DEFAULT '{}'
- hr_enabled boolean NOT NULL DEFAULT false
- hr_share_with_pt boolean NOT NULL DEFAULT false
- hr_share_on_screen boolean NOT NULL DEFAULT false
- hr_save_history boolean NOT NULL DEFAULT false

### profiles
- email text NULL
- membership_status text NOT NULL DEFAULT 'approved' (TEST current default; membership gate candidate changes new-user lifecycle and requires reviewed rollout)
- member_rank text NULL

### pt_requests
- archived_at timestamptz NULL
- pt_session_id uuid NULL

### pt_sessions
- session_type text NOT NULL DEFAULT 'guided'
- coach_notes text NOT NULL DEFAULT ''
- completed_notes text NOT NULL DEFAULT ''
- attendance_status text NOT NULL DEFAULT 'scheduled'
- cancellation_note text NOT NULL DEFAULT ''

### social_posts
- author_role text NOT NULL DEFAULT 'member'

### wods
- is_archived boolean NOT NULL DEFAULT false
- category text NOT NULL DEFAULT 'main'

### workout_logs
- class_live_session_id uuid NULL
- save_token uuid NULL

### workout_sets
- height_cm numeric NULL

## Entirely absent production tables
calendar_events, challenge_participants, challenges, class_live_sessions, class_session_wod_completions, coffee_order_items, coffee_orders, coffee_product_reviews, coffee_products, coffee_settings, daily_wod, exercise_favorites, notifications, pt_checkins, pt_client_assignments, pt_client_goals, pt_coaches, pt_intakes, pt_program_sessions, pt_program_templates, pt_programs, pt_service_requests, pt_services, pt_wod_assignments, training_session_wods, training_sessions, wod_daily_schedules, wod_favorites.

## Constraint, trigger and function deltas
- TEST has 156 more constraints by count; constraint names absent in Production must be reviewed with their definitions and referenced objects before migration. Constraints on the 28 absent tables are expected; shared-table constraint changes are a separate gate.
- TEST has 38 more non-internal public triggers. The missing set includes class capacity/waitlist, coffee notifications, notification state protection, PT assignment/session/program/message/booking guards and notification triggers, WOD archival guards and workout-log consistency. Do not copy triggers independently of their referenced functions and tables.
- TEST has 67 more public functions and 2 app_private helpers. Production function inventory is materially incomplete for the current application RPC contract.
- Production currently has 49 RLS policies versus 144 in TEST. Counts do not prove semantic equivalence. Known broad class-booking and PT-session read policies remain production privacy blockers.

## Release implications
This is not a safe "add missing columns and tables" migration. The missing objects are interdependent: foreign keys, indexes, functions, triggers, RLS, grants, and application RPC signatures must be introduced as a coherent reviewed dependency graph. TEST's schema cannot simply be replayed as a baseline in Production: migration lineage and environment-specific data/config must be reconciled first.

## Required next gates
1. Build an ordered object dependency manifest (tables/types → columns → constraints/indexes → helper functions/RPCs → triggers → RLS/grants → storage/edge functions).
2. Resolve the exact production migration ledger and reconcile the 11 production entries against source migration history. Never replay TEST bootstrap/seed migrations.
3. Generate a single reviewed forward-only production migration set and validate it against a disposable full Supabase restore with real roles and auth context.
4. Re-run cross-member privacy tests and full app RPC integration tests.
5. Owner-run encrypted backup and full isolated restore (database plus Auth/Storage/function config).
6. Bootstrap/verify owner admin login and approval flow before any reset.
7. Only after all gates pass, perform the owner-approved clean-start reset while preserving the 56 standard exercise rows and safe system configuration.

Status: read-only schema audit complete; Production release remains NO-GO.
