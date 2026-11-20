# B73 – GO LIVE workstream status and dependency audit
Date: 2026-11-21
Release target: SturmKopf Feuer 1.1
Branch: `garasjegym-2.0-sturm­kopf`

## Executive status
Production remains **NO-GO**. Read-only production inspection, migration lineage review, schema dependency ordering, RLS delta analysis, Edge Function comparison and isolated CI rehearsals have advanced. No Production DDL/DML, migration ledger edits, policy/grant changes, Auth changes, Edge Function deployment, operational-data deletion or Production release has been performed.

## 1. Production migration lineage – candidate mapping
Production has 11 migration ledger entries; active v2 chain has 164 migration files. None of the 11 Production migration version identifiers matches an active v2 filename version.

Read-only catalog state and current migration source suggest these candidate correspondences (intent mapping only, not proof of exact original SQL):
| Production migration name | Current source candidate / catalog evidence |
|---|---|
| lock_down_manager_profile_updates | Current production `profile_update_staff` policy restricts manager updates to other member rows and excludes self; exact original migration source not recovered |
| restrict_trigger_function_execution | `20261116230042_restrict_trigger_rpc.sql`; current trigger functions are not client-executable |
| restrict_anon_security_definer_rpc | `20261116230023_harden_rpc_grants.sql`; current security-definer API grants are consistent with anon revocation |
| workout_result_scoring_fields | `20261117203914_add_workout_log_score_fields.sql`; score columns exist in Production |
| align_workout_log_result_data | `20261117210959_align_workout_log_result_data.sql`; `result_data` exists in Production |
| wod_timer_settings_and_exercise_metadata | `20261116230008_wod_timer_settings.sql` and `20261118084152_wod_exercise_catalog_expansion.sql`; observed timer/body-area/rehab columns exist |
| exercise_prescription_profiles | `20261118194828_exercise_prescription_profiles.sql`; observed column exists |
| revoke_anon_security_definer_execute | Candidate trigger/RPC privilege migrations; exact original SQL not recovered |
| harden_production_security_definer_paths | `20261119202903_harden_security_definer_search_paths.sql`; seven observed security-definer paths are pinned |
| secure_pt_session_capacity | `20261120110502_secure_pt_session_capacity.sql`; private capacity helper and view exist in Production |
| revoke_anon_public_table_access | `20261120091100_revoke_anon_public_table_access.sql`; Production anon table SELECT/write privilege counts are zero |

The original 11 SQL definitions, hashes, and ledger-time ordering remain unverified. Similar purpose and matching live catalog state are not equivalent to source recovery. Do not edit the live migration ledger, replay a TEST baseline, or assume these candidate files reconstruct the original history.

## 2. Schema dependency graph and replay
TEST catalogue inspection identified 46 public base tables and 95 foreign-key edges. The FK graph is acyclic; topological creation layers are:

- Layer 0: `coffee_products`, `member_preferences`, `profiles`
- Layer 1: `challenges`, `classes`, `coffee_orders`, `coffee_settings`, `exercise_favorites`, `exercises`, `notifications`, `pt_checkins`, `pt_client_assignments`, `pt_client_goals`, `pt_client_notes`, `pt_coaches`, `pt_intakes`, `pt_messages`, `pt_program_templates`, `pt_services`, `social_posts`, `training_sessions`, `wods`
- Layer 2: `challenge_participants`, `class_bookings`, `class_live_sessions`, `coffee_order_items`, `daily_wod`, `pt_programs`, `pt_service_requests`, `social_comments`, `training_session_wods`, `wod_daily_schedules`, `wod_favorites`
- Layer 3: `class_session_wod_completions`, `coffee_product_reviews`, `workout_logs`
- Layer 4: `personal_records`, `pt_program_sessions`, `pt_sessions`, `workout_exercises`
- Layer 5: `calendar_events`, `pt_bookings`, `pt_requests`, `pt_session_exercises`, `pt_wod_assignments`, `workout_sets`

Dependency order for a complete replay must continue: base tables and columns → constraints and indexes → helper functions/RPCs → triggers → grants → RLS policies → views/storage/publications → Edge Function integration and configuration.

### Full local Supabase replay finding
A full clean local Supabase PostgreSQL 17 stack was started successfully and began applying the active migration chain. It halted at `20261119132525_wod_daily_schedules.sql` because `public.daily_wod` had not been created in the v2 sequence. The exact source SQL existed under the legacy root `supabase/migrations/202611172000_daily_wod.sql`, not under `v2/supabase/migrations/`.

That verified source migration has now been copied unchanged into the v2 chain as `v2/supabase/migrations/202611172000_daily_wod.sql`. A local-replay retry is queued on the next commit.

The initial full-replay runner used `supabase/setup-cli@v1` with `version: latest`; GitHub API rate limiting prevented version resolution on one attempt. The workflow is now pinned to Supabase CLI `3.2.0` to remove the extra "latest release" API lookup. The next CI run must verify the CLI install, start the local stack, apply all migrations from empty state, and stop cleanly. One replay failure is not evidence that every migration is now valid.

## 3. RLS and access-surface delta
Across 18 base tables shared by Prod and TEST:
- Production has 49 RLS policies; TEST has 55.
- 12 TEST policy names are absent from Production; 9 Production-only policy names exist; 34 same-name policies differ.
- Across the full TEST schema there are 104 policies whose names are not in Production; many belong to the 28 completely missing tables.

Critical differences needing tested rollout:
- Confirmed class bookings are globally readable by active users in Production; TEST limits them to own booking or staff.
- All published PT sessions are readable in Production, including client-linked private sessions; TEST restricts visibility to public unassigned slots, own bookings, assigned coach/client access and staff.
- Class listings are not restricted to published entries in Production.
- TEST has tighter future/published booking guards and attendance field controls.
- TEST includes assigned-coach access for PT profiles, messages, requests, notes, bookings, sessions, and session exercises; these policy deltas must ship with the underlying assignments table and helper functions.
- Production-only legacy policy names must be reconciled carefully to avoid additive permissive-policy OR behaviour.

The isolated PostgreSQL 17 membership/auth + privacy rehearsal has passed the existing assertions for self/profile isolation, approval lifecycle, assigned coach, private PT sessions and class booking visibility. It remains a narrow fixture, not a full Supabase restore.

## 4. Trigger-function execution hardening
A new forward-only migration has been added:
`v2/supabase/migrations/20261121000100_revoke_public_execute_from_trigger_functions.sql`.
It discovers non-internal triggers on public tables and revokes client roles' direct EXECUTE on their public-schema trigger functions.

New PostgreSQL 17 fixture and assertions verify:
- anon/authenticated lose direct EXECUTE on attached trigger-only routines,
- already-created triggers still execute after revocation.

This dedicated PG17 job passed on the previous full check run. It only tests a disposable local fixture, not the live Production catalog.

## 5. App integration and Edge Functions
Observed via read-only Supabase function inventory:
- Production: only `garasjegym-music` v2, `verify_jwt=false`; code checks bearer JWT manually.
- TEST: `admin-create-user` v2 (returns HTTP 410 and is intentionally disabled) and `admin-delete-user` v2 (JWT verification enabled).
- Current app admin UI calls `admin-delete-user`; production lacks that Edge Function.
- Music component source uses personal Spotify OAuth and does not call `garasjegym-music`; production music function appears stale/unreferenced by current UI and needs product-owner confirmation before removal/retention.
- Production is missing multiple application RPCs and their dependencies; complete app integration cannot be certified until all 46 tables, 75 functions, 44 triggers, 144 policies, grants, storage/publication and edge dependencies are replayed and exercised in a full rehearsal.

## 6. Owner backup, restore and admin gates
No encrypted Production backup or isolated restore has been run in this workflow. Supabase connector access does not expose an owner backup or Auth/Storage export; it also does not provide a secure way to perform the owner login/password verification.

The owner must:
1. Produce encrypted DB schema/data/roles backup using the owner's secure CLI environment.
2. Separately preserve/verify Auth identities and configuration, Storage objects/buckets/policies, Edge Function sources, environment secrets, Auth provider settings and redirect URLs.
3. Restore all components into a fresh isolated PG17 Supabase rehearsal environment.
4. Replay the complete migration candidate set and test rollback/restore.
5. Verify the single owner-admin identity can sign in and still has admin permissions after the membership gate is applied.
6. Only then approve the clean-start reset: retain exactly one owner admin, retain all 56 standard system exercises and safe singleton coffee settings, clear operational data, then verify all member-facing and admin flows.

The admin bootstrap candidate has passed disposable PG17 policy/auth assertions, but no Production login or owner identity was changed. Existing Production admin stays intact.

## 7. Release gate decision
- App build and automated tests: passed on the latest fully completed app-check commit before this report.
- Trigger-only direct-execution rehearsal: passed on disposable PostgreSQL 17.
- Wave1/Wave2 auth and RLS fixture: passed on disposable PostgreSQL 17.
- Full local Supabase replay: first run exposed a missing source migration; source copied into v2 and CLI pinned, retry pending.
- Production migration lineage: not certified; 11 exact source definitions remain unrecovered.
- Full restore rehearsal: not run.
- Owner admin sign-in after gate: not verified.
- Clean-start reset: not performed.
- Production deployment: not performed.

**Production remains NO-GO** until the full Supabase replay and functional suite pass, production migration lineage is reconciled, an owner-run encrypted backup and isolated restore succeed, and the owner admin signs in successfully before the clean-start reset.
