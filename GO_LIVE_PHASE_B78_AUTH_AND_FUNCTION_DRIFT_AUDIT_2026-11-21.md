# B78 – Critical Production-vs-TEST function and Auth drift
Date: 2026-11-21
Branch: `garasjegym-2.0-sturm­kopf`
Audited branch head: `aa09f4441a125994282b170a841a5df2293495a8`
Production project: `kultdmklwmilhoytrrig`
TEST project: `izwzwvlexqxqewzijhhd`

## Purpose
This is a read-only comparison of live Production function bodies with the same named/signature functions in TEST. It is not a migration and was not applied to either database.

## Findings
All seven functions below exist in both environments, but their definitions differ materially. This is not merely whitespace or formatting drift.

### Auth signup and membership gate
- Production `handle_new_auth_user()` creates a profile with only id, display_name and role='member'. It does not set email, active=false or membership_status='pending'.
- TEST `handle_new_auth_user()` sets email, active=false and membership_status='pending'. This is the pending-member approval gate.
- Production `is_active_user()` checks only `profiles.active = true`. TEST additionally requires `membership_status = 'approved'`.
- Production `is_admin()` and `is_admin_or_manager()` check active and role only. TEST additionally requires approved membership.

**Consequence:** A new user created in Production does not receive the pending approval state. The live helper functions do not enforce the new membership gate. Releasing the current client against Production before a reviewed migration would leave a material mismatch in account onboarding and authorization.

### PT booking privacy and inventory
- Production `book_pt_session(uuid)` permits booking any published PT session. TEST additionally restricts booking to public slots where `client_id IS NULL`.
- Production `pt_promote_waitlist_after_cancel()` can promote waitlisted members without checking that the session is still published and in the future. TEST checks both, locks/promotes one row safely and creates a deduplicated notification.
- Production `check_class_booking_capacity()` does not lock the class row before capacity counting and does not reject an invalid waitlist status when seats remain. TEST locks the class row and enforces the waitlist invariant.

### What is not a difference
- The two environments' `set_updated_at()` definition is identical.
- The compared functions have matching client execute privileges in the checked cases; the issue here is function-body behaviour, not simply a grant mismatch.

## Release impact
These are direct live Production behaviour differences in account creation, membership gating, PT session privacy/booking, waitlist promotion and class capacity concurrency. They reinforce the Production NO-GO decision.

## Safety
Only read-only catalog/function-definition queries were run. No Production DDL/DML, Auth, policies, grants, Edge Functions, user data, or deployment changes were made.

## Required action
Create a reviewed forward-only migration candidate to align these functions with the tested v2 contract, but only after an Auth-preserving backup and a full isolated restore. Rehearse signup, existing admin/manager access, public PT booking, client-linked session privacy, waitlist concurrency, class capacity, notification delivery, and rollback on that restored copy before any live application.
