# Phase B94 – read-only Production/TEST RLS policy gap (2026-11-21)

This is an inventory, not a migration or permission to copy TEST data. Compared `pg_policies` from Production `kultdmklwmilhoytrrig` and TEST `izwzwvlexqxqewzijhhd`, selecting only policy metadata. No member data, Auth identities, keys or secrets were read.

## Summary

- Production: **49** public RLS policies.
- TEST target: **144** public RLS policies.
- **104 target policy names absent** in Production: 89 on tables absent from Production, 15 on tables already present.
- **34 shared names have differing policy definitions** (raw `pg_policies` metadata comparison; review semantics, not just textual equality).
- **9 Production-only policy names** need explicit replace/retain decisions, not silent addition of overlapping permissive policies.

## Target policies missing on existing Production tables (15)

`exercises.exercises_read_combined`, `exercises.exercises_staff_delete`, `exercises.exercises_staff_insert`, `exercises.exercises_staff_update`, `member_preferences.member_preferences_read_own`, `pt_bookings.pt_bookings_staff_delete`, `pt_bookings.pt_bookings_staff_insert`, `pt_session_exercises.pt_session_exercises_read_combined`, `pt_session_exercises.pt_session_exercises_staff_delete`, `pt_session_exercises.pt_session_exercises_staff_insert`, `pt_session_exercises.pt_session_exercises_staff_update`, `wods.wods_read_combined`, `wods.wods_staff_delete`, `wods.wods_staff_insert`, `wods.wods_staff_update`

## Shared policy names with differing metadata (34)

`class_bookings.class_bookings_delete_admin`, `class_bookings.class_bookings_insert_own`, `class_bookings.class_bookings_read_own_or_staff`, `class_bookings.class_bookings_update_own_or_admin`, `classes.classes_read_members`, `member_preferences.member_preferences_insert_own`, `member_preferences.member_preferences_update_own`, `personal_records.personal_records_delete_own_or_staff`, `personal_records.personal_records_insert_own`, `personal_records.personal_records_read_own_or_staff`, `profiles.profile_select_own_or_staff`, `profiles.profile_update_staff`, `pt_bookings.pt_bookings_read`, `pt_bookings.pt_bookings_update`, `pt_client_notes.pt_client_notes_staff_all`, `pt_messages.pt_messages_delete_participants_or_staff`, `pt_messages.pt_messages_insert`, `pt_messages.pt_messages_read`, `pt_requests.pt_requests_member_insert`, `pt_requests.pt_requests_read`, `pt_requests.pt_requests_update`, `pt_sessions.pt_sessions_read`, `pt_sessions.pt_sessions_staff_insert`, `pt_sessions.pt_sessions_staff_update`, `social_comments.social_comments_delete_own_or_staff`, `social_comments.social_comments_insert_own`, `social_posts.social_posts_delete_own_or_staff`, `social_posts.social_posts_insert_own`, `workout_exercises.workout_exercises_access_via_log`, `workout_logs.logs_delete_own_or_staff`, `workout_logs.logs_insert_own`, `workout_logs.logs_read_own_or_staff`, `workout_logs.logs_update_own_or_staff`, `workout_sets.workout_sets_access_via_log`

## Production-only policy names (9)

`exercises.exercises_manage_staff`, `exercises.exercises_read_members`, `member_preferences.member_preferences_select_own`, `pt_bookings.pt_bookings_delete`, `pt_bookings.pt_bookings_insert`, `pt_session_exercises.pt_session_exercises_read`, `pt_session_exercises.pt_session_exercises_staff_all`, `wods.wods_manage_staff`, `wods.wods_read_published`

## Required release action

Reconcile policies alongside the 28 new tables, 35 added columns, 26 target RPCs and function grants. Review roles, USING and WITH CHECK predicates; require inactive/pending member denial, member data isolation, staff-only actions, anon denial, and Auth owner-admin access tests. Do not blindly grant `authenticated` access or append new permissive policies without checking old ones. Existing Production is not ready for release; **no Production writes were performed**.

