# B83 – SturmKopf Feuer 1.1 clean-start data contract
Date: 2026-11-21
Branch: `garasjegym-2.0-sturm­kopf`
Status: approved product/data requirement; implementation and production execution remain gated.

## Binding owner decision
Start with an operationally empty database and create exactly one NEW owner administrator. Do not carry forward any old user identity, profile, member account, activity or history. The old database is a rollback source only, not a data migration source.

## Preserve as product content
- Exercise library: preserve the complete reconciled union of the Production 56, the TEST 94 and the 41 named expansion candidates, after explicit semantic-alias review. The final count is not assumed to be 94 or 97; 94 is only a lower-bound baseline until the canonical manifest is approved. All rows in the release catalogue are system rows (`created_by IS NULL`), with no legacy custom/member-created rows.
- Preserve exercise names, categories, equipment, instructions, body-area metadata, rehab classification and valid video URLs from the reviewed canonical catalogue.
- Required categories: CrossFit, Kjerne, Kondisjon, Mobilitet, Pilates, Rehab / fysio, Styrke.
- Preserve application code, schemas, policies, functions and feature capabilities needed for the release. Empty operational tables must remain available for new use.

## Do not migrate any old records
- Auth users, identities, sessions, profiles, members, managers or invitations.
- Group classes, class schedules, group-session records, bookings, waitlists, attendance, live sessions or class WOD completions.
- Any messages or conversations, including PT messages.
- Coffee orders, order items, product reviews or other coffee transaction history.
- Training sessions, workout logs, sets, WOD history, saved WODs, favorites or daily WOD history.
- PRs, challenges/participants, notifications, calendar events, social posts/comments.
- PT bookings, requests, check-ins, programs, program sessions, assignments, client notes, goals, intakes or session exercises.

## Recreate fresh after reset
- Exactly one newly created Auth identity linked to exactly one active, approved admin profile.
- No other profiles, members, managers or legacy Auth identities.
- Fresh configuration/catalogue values needed by modules (for example coffee products/settings) may be created from reviewed defaults; never copy old order or review rows.
- Group-class and messaging modules stay enabled and usable, but begin with zero classes/sessions/bookings/waitlists/messages.

## Mandatory release gates
1. A protected, verified Production backup and a documented rollback path exist before any destructive operation.
2. Production schema and migration-lineage drift is reconciled with forward-only, reviewed migrations. Never edit migration ledger rows manually or replay TEST bootstrap/fixtures into Production.
3. The canonical 94 exercise records are enumerated and reviewed by name/category/metadata. The exact-94 integrity gate, seven-category check and duplicate-name check pass. A row count alone is not sufficient.
4. The new admin is created through the approved owner-controlled process; credentials and secrets are never placed in GitHub or ChatGPT.
5. Post-reset read-only acceptance confirms exactly one linked new Auth identity and admin profile; zero non-admin profiles; zero legacy Auth identities; zero rows in all operational/history tables listed above; and complete reconciled exercise catalogue (final count measured after alias review).
6. Verify group-class creation, booking, cancellation/waitlist and messaging work with new records after acceptance; the empty-state gate must not disable these features.
7. Complete mobile/tablet and desktop acceptance, RLS/privacy tests, Auth/login tests and production-target build checks.
8. Production deployment and database reset require explicit final GO LIVE authorization after all gates pass.

## Current known blockers
- Production has only 18 of 46 expected application tables and 0 of 26 app RPCs at the last audit.
- Production migration ledger has 11 entries whose exact timestamped SQL files are missing from the active branch.
- Production Auth/RLS/function behaviour differs materially from the tested target.
- The exact 94-row canonical exercise list has not yet been independently enumerated and compared. The existing 56-row legacy-preservation SQL is not a complete 94-row catalogue definition.
- A verified backup/restore rehearsal and new owner-admin login acceptance are still outstanding.

## Safety boundary
This contract and associated read-only checks do not authorize or perform a Production reset, data deletion, schema migration, Auth deletion, edge-function deployment or app deployment. No Production change is made by this document.
