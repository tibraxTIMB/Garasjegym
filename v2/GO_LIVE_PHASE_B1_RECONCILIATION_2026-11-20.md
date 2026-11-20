# GO LIVE – Phase B1 live reconciliation snapshot

**Date:** 2026-11-20  
**Release target:** SturmKopf Feuer 1.1  
**Branch:** `garasjegym-2.0-sturm­kopf`  
**Status:** NO-GO – live schema snapshot refreshed; production restore and forward migration rehearsal still blocked.

This is a read-only follow-on to the Phase A capture. No production or test schema, data, Auth settings, or deployment targets were changed.

## 1. Project health and migration ledgers

Both Supabase projects were queried again and report `ACTIVE_HEALTHY`.

| Item | Production | Test |
|---|---:|---:|
| Project | `kultdmklwmilhoytrrig` | `izwzwvlexqxqewzijhhd` |
| Region | `eu-west-2` | `eu-north-1` |
| PostgreSQL | 17.11.0.019 | 17.12.0.000 |
| Public base tables | 18 | 46 |
| Installed migrations | 11 | 163 |
| RLS enabled | 18/18 | 46/46 |
| RLS disabled | 0 | 0 |

The test ledger is not a production migration path. It includes a test-only baseline and seed migration. The 11 production versions are not represented in the V2 migration directory. The 163 V2 files match the test ledger by version, but a fresh clean replay has not been demonstrated.

## 2. Fresh table and column comparison

The live table inventory was read in verbose mode in both projects.

- 18 production tables are present in test.
- 28 additional test tables are absent from production.
- No production-only public base tables were found.
- Ten shared tables have test-only columns; no production-only columns were reported in those ten tables.

| Shared table | Test-only columns |
|---|---|
| `profiles` | `email`, `membership_status`, `member_rank` |
| `wods` | `is_archived`, `category` |
| `workout_logs` | `class_live_session_id`, `save_token` |
| `workout_sets` | `height_cm` |
| `pt_sessions` | `session_type`, `coach_notes`, `completed_notes`, `attendance_status`, `cancellation_note` |
| `pt_requests` | `archived_at`, `pt_session_id` |
| `classes` | `instructor_id`, `published`, `cancelled_at`, `cancelled_by`, `cancellation_note`, `prep_text`, `main_text`, `finish_text`, `coach_notes` |
| `class_bookings` | `attendance_status`, `attendance_marked_at`, `attendance_marked_by` |
| `social_posts` | `author_role` |
| `member_preferences` | `created_at`, `last_seen_pt_wod_at`, `spotify_genre_playlists`, `hr_enabled`, `hr_share_with_pt`, `hr_share_on_screen`, `hr_save_history` |

The table API snapshot does not include every type/default/check/index/policy/function/trigger definition. This is not yet a complete schema diff or an executable migration plan. In particular, the previously recorded `exercises.body_area`, `workout_logs.result_data`, class waitlist/capacity and RPC differences still require definition-level reconciliation.

## 3. Fresh privilege/RLS SQL checks

Read-only SQL was executed against both databases.

| Check | Production | Test |
|---|---:|---:|
| Public tables with RLS | 18 | 46 |
| Public tables with RLS disabled | 0 | 0 |
| Public tables with direct anon grants | 0 | 0 |
| Public SECURITY DEFINER functions executable by anon | 0 | 0 |
| Public SECURITY DEFINER functions without fixed search_path | 0 | 0 |
| Public SECURITY DEFINER functions total | 7 | 49 |

Production Security Advisor still reports four authenticated SECURITY DEFINER entry points (`book_pt_session`, `is_active_user`, `is_admin`, `is_admin_or_manager`) and leaked-password protection disabled. Production Health Advisor returned no lints.

Test Security Advisor reports 25 authenticated SECURITY DEFINER warnings and leaked-password protection disabled. Test Health Advisor returned no lints. The 49 total public SECURITY DEFINER functions in test is a broader catalog count than the advisor's 25 callable-by-authenticated findings; these figures are not contradictory. Do not blanket-convert or revoke RPCs: retain only a reviewed function-by-function allowlist with call-path and authorization tests.

## 4. Release pipeline finding

The checked-in `.github/workflows/deploy-sturmkopf-pages.yml` is a preview workflow:
- It builds against the TEST Supabase URL and publishable key.
- Pushes create a build artifact only.
- The Pages deploy job requires a manual `workflow_dispatch` with `publish_preview=true`.
- It is not a production deployment workflow and must not be repurposed as one.

A separate production workflow must be designed with protected production environment approval, production-only URL/publishable-key secrets or variables, immutable release SHA, and explicit post-deploy smoke tests. Do not add production credentials to the preview workflow.

## 5. Next safe work package

1. Obtain dashboard evidence for production PITR/backup entitlement, retention and latest completed restore point. Record timestamp and retention.
2. Obtain a production schema export/capture suitable for an isolated restore rehearsal. The test project is not a substitute for a backup.
3. Locate/archive the original SQL for the 11 production-applied migrations, or reconstruct their exact intent from production definitions and repository history.
4. Build a new production-derived forward-only migration sequence. Include only reviewed additive or compatibility-safe changes; explicitly reconcile changed constraints, policies, triggers, indexes, functions and views.
5. Rehearse on a fresh restore of production in an isolated environment, subject to explicit cost approval for any new paid resource. Compare row counts and key relationships before/after and run the full application test suite.
6. Only after rehearsal passes, prepare a separate production workflow. Production DDL and deployment still require the owner's explicit GO LIVE approval.

## 6. Gate decision

**Phase B1 complete:** current project health, live table/column inventory, RLS and anonymous privilege posture, advisor state and preview workflow have been rechecked.

**Still blocked:** recoverable production backup evidence, restore rehearsal, production-origin migration source/reconciliation, complete definition-level diff, and a production deployment workflow.

**No production or test mutations were made in this phase. No production deploy was attempted.**
