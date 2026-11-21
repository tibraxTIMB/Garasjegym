# Phase B93 – read-only Production/TEST column gap (2026-11-21)

This is an inventory, **not** authorization to copy TEST data, replay its migration ledger, or apply a schema change. Captured via read-only `information_schema.columns` from Production `kultdmklwmilhoytrrig` and TEST `izwzwvlexqxqewzijhhd`. No row values, Auth identities or secrets were retrieved. The owner accepted proceeding without backup, but admin-login continuity and a production-shaped dry run remain mandatory.

## Summary

- Production: 18 public base tables and 170 public base-table columns.
- TEST release target: 46 public base tables and 506 public base-table columns.
- **336 release columns absent from Production:** 301 belong to the 28 absent tables; **35 belong to tables already present**.
- **2 existing-column nullability differences** need deliberate reconciliation. Types (`data_type`/`udt_name`) match in both cases.
- The previous release preflight's three missing `profiles` columns are only a subset of the 35 missing columns on existing tables.

## Missing columns in existing Production tables (35)

| Table | Missing target columns |
| --- | --- |
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

## Existing column constraint drift

| Column | Production | TEST target |
| --- | --- | --- |
| `exercises.body_area` | nullable text, no default | NOT NULL text, default `'Fullkropp'` |
| `workout_logs.result_data` | NOT NULL jsonb, default `{}` | nullable jsonb, no default |

Any `NOT NULL` change needs a deliberate backfill/default check on preexisting rows; do not mechanically copy the TEST column definition onto live Production. Review other default/constraint differences separately; this inventory only compared column presence and nullable/type metadata.

## Next safe execution gate

1. Export the verified TEST target's **schema only**, without rows, via the isolated CI replay.
2. Build a forward-only reconciliation plan for 28 missing tables, 35 missing columns on existing tables, 26 release RPC names, related triggers, indexes, grants and RLS; review the two nullability differences.
3. Rehearse against a Production-shaped isolated fixture, then assert 46 tables, all columns, all RPCs and positive/negative role tests.
4. Establish verified new owner-admin login and only then run any clean-start deletion and production publish.

**Production remains NO-GO.** This check made no Production writes.
