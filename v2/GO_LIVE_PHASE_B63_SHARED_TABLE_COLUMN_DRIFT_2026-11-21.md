# GO LIVE Phase B63 – shared-table column contract drift
**Date:** 2026-11-21  
**Release:** SturmKopf Feuer 1.1  
**Branch head before report:** `d6362b0c826978faddb698702f66ff003471ca7a`

## 1. Confirmed production-vs-TEST column drift
Direct read-only comparison of ten shared tables shows production is missing the following columns currently present in TEST and expected by current v2 feature flows:

| Table | Missing from production (present in TEST) |
|---|---|
| `class_bookings` | `attendance_status, attendance_marked_at, attendance_marked_by` |
| `classes` | `instructor_id, published, cancelled_at, cancelled_by, cancellation_note, prep_text, main_text, finish_text, coach_notes` |
| `member_preferences` | `created_at, last_seen_pt_wod_at, spotify_genre_playlists, hr_enabled, hr_share_with_pt, hr_share_on_screen, hr_save_history` |
| `profiles` | `email, membership_status, member_rank` |
| `pt_requests` | `archived_at, pt_session_id` |
| `pt_sessions` | `session_type, coach_notes, completed_notes, attendance_status, cancellation_note` |
| `social_posts` | `author_role` |
| `wods` | `is_archived, category` |
| `workout_logs` | `class_live_session_id, save_token` |
| `workout_sets` | `height_cm` |

The existing common columns are not proof that the tables are functionally equivalent. Constraints, defaults, indexes, triggers, RLS policies and grants also require comparison.

## 2. Product impact
- Group-class attendance and publishing flows depend on the extra class/booking columns.
- Member preferences, Spotify genres and heart-rate settings depend on fields missing in production.
- Membership-aware sign-in and member ranking depend on profile fields missing in production.
- PT archive/session lifecycle depends on missing PT columns.
- WOD archive/category behaviour and exercise-height logging depend on missing columns.
- Workout idempotency and live-class linkage depend on missing workout-log columns.

## 3. Required handling
Do not apply a quick ALTER TABLE patch based only on this list. Each column needs its exact type, nullability, default, constraints, indexes, trigger behaviour, RLS policy and source migration verified. Some fields have dependencies on absent tables/functions identified in B62.

A single coherent production schema reconciliation is required, with an isolated restore rehearsal and end-to-end tests. A fresh blank launch may reduce data-migration complexity, but it does not remove the need for a complete schema, security and bootstrap plan.

## 4. Actions
- Read-only column comparison for the ten shared tables.
- No schema changes, no migration application, no data reset, no Edge Function deployment, no production deployment.

**B63 result:** Confirmed ten shared tables with material column drift. Production remains NO-GO.
