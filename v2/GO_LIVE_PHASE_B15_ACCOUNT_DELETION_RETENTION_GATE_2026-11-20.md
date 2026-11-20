# GO LIVE Phase B15 – account deletion and profile-retention gate

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** CURRENT TEST DELETE FUNCTION NOT PRODUCTION-SAFE; PRODUCTION DEPLOYMENT BLOCKED

## 1. Edge Function inventory (live, read-only)

Production project `kultdmklwmilhoytrrig` exposes only:

- `garasjegym-music`, ACTIVE v2, `verify_jwt=false`.

Test project `izwzwvlexqxqewzijhhd` exposes:

- `admin-create-user`, ACTIVE v2, `verify_jwt=true` (known to return HTTP 410; account creation remains disabled).
- `admin-delete-user`, ACTIVE v2, `verify_jwt=true`.

There is no `admin-delete-user` function in production.

## 2. Test delete function – incompatibilities and data-loss risks

The test implementation validates the caller's bearer token, checks an active admin role, blocks self-deletion and admin-account deletion, and checks a list of linked history before deleting the Auth user. However, it cannot be deployed unchanged to production:

- It checks numerous test-only tables that do not exist in production (e.g. `class_live_sessions`, `training_sessions`, `challenges`, PT Studio tables, calendar, coffee).
- A query error in any check aborts deletion. In production, this would make the function unusable because several referenced tables are absent.
- It omits important production relationships, including class bookings, PT bookings, PT requests, workout logs, personal records, social posts/comments, WOD authorship and exercise authorship.
- It only selects profile `role,active`; it does not enforce the new approved-membership gate.
- The function returns detailed linked-history counts. These are acceptable to an authorized admin but should be minimized in logs and responses.
- A missing/incorrect FK mapping or unrecognized table cannot be treated as zero history.

**Do not deploy the test function to production.** A missing-table error is not a safe substitute for a production FK inventory.

## 3. Fresh production FK inventory

Read-only inspection of every FK referencing `public.profiles(id)` returned:

| Table.column | Delete rule |
|---|---|
| `class_bookings.member_id` | CASCADE |
| `classes.created_by` | NO ACTION |
| `exercises.created_by` | SET NULL |
| `personal_records.member_id` | CASCADE |
| `pt_bookings.member_id` | CASCADE |
| `pt_client_notes.client_id` | CASCADE |
| `pt_client_notes.coach_id` | RESTRICT |
| `pt_messages.client_id` | CASCADE |
| `pt_messages.sender_id` | RESTRICT |
| `pt_requests.handled_by` | SET NULL |
| `pt_requests.member_id` | CASCADE |
| `pt_sessions.client_id` | SET NULL |
| `pt_sessions.created_by` | RESTRICT |
| `social_comments.author_id` | CASCADE |
| `social_posts.author_id` | CASCADE |
| `wods.created_by` | SET NULL |
| `workout_logs.member_id` | CASCADE |

This confirms permanent Auth deletion can cascade into personal records, class/PT bookings, PT client data, social content and workout history. It can also be blocked by staff-authored records due to RESTRICT/NO ACTION. This is not an acceptable default for ordinary member offboarding.

## 4. Required production behavior

The production function must use a fail-closed, production-derived reference inventory:

1. Authenticate the caller using the bearer token and Auth `getUser`; never trust a caller-supplied role or user ID.
2. Require the caller to be an active, approved admin; reject managers and the target user themselves.
3. Protect the last active approved admin from deletion or deactivation.
4. Reject deletion of any admin account.
5. Inventory all production FK references and business ownership references; if the schema differs or any check errors, abort with no deletion.
6. Permanent deletion must be unavailable when the account owns or authored durable history, including workouts/PRs, bookings, PT messages/notes, social posts/comments, WODs, exercises or staff-created classes.
7. For members with history, provide a separate explicit deactivation/anonymization workflow. Do not use Auth deletion as a shortcut to cascade-delete history.
8. Before any future hard delete, require a reviewed retention policy for each table and verify FK behavior in an isolated restore.
9. Use service-role credentials only inside the Edge Function; never expose them to the client.
10. Add audit logging without exposing private note/message bodies, tokens, emails or service-role values.
11. Add idempotency and a clear partial-failure strategy for Auth/profile deletion.
12. Restrict CORS to the actual app origins once the production origin is finalized.

## 5. Required acceptance tests

- Active approved admin can request deactivation of a normal member.
- Manager, member, pending, rejected, anonymous, expired-token and self-delete attempts are denied.
- Last active approved admin cannot be removed.
- Admin target cannot be removed through member management.
- A member with any production history cannot be permanently deleted.
- All FK preflight errors fail closed; no missing table/column is treated as zero references.
- Deactivation preserves profile identity and historical foreign-key relationships.
- Auth and profile state remain consistent after retries or network failure.
- Every cascade/restrict behavior is asserted on a fresh isolated production restore.
- No history or private data is returned to an unauthorized caller.

## 6. Execution boundary

Only live Edge Function inventory, test function source review and read-only production FK catalog inspection were performed. No Edge Function, Auth user, profile, FK, policy, secret or deployment was changed.

**B15 result:** Test `admin-delete-user` is not production-compatible. Production FK relationships show significant cascade-loss risk. A production-specific deactivation-first workflow is required. Release remains **NO-GO**.
