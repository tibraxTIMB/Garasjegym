# B90 – Edge Function dependency and admin-delete release gate
Date: 2026-11-21
Release: SturmKopf Feuer 1.1
Branch audited: `a5f5e12356c8c3638c0ef3cbb538d8af3581ced2`

## Read-only function inventory
Production project `kultdmklwmilhoytrrig` currently has only:
- `garasjegym-music`, ACTIVE v2, `verify_jwt=false`.

TEST project `izwzwvlexqxqewzijhhd` currently has:
- `admin-delete-user`, ACTIVE v2, `verify_jwt=true`.
- `admin-create-user`, ACTIVE v2, `verify_jwt=true`, but returns HTTP 410 and explicitly disables user creation.

The current STURMKOPF client source `v2/src/components/Admin.jsx` invokes `supabase.functions.invoke('admin-delete-user')` in its member deletion action. Therefore the current app's delete-member action will fail against Production until the function is deployed there. This is a confirmed app-to-function dependency, not a hypothetical dependency.

The user-creation function is intentionally disabled and the current app does not invoke `admin-create-user`, consistent with the owner requirement to remove in-app account creation.

## Security review of admin-delete-user
The repository function source:
- Requires POST and a bearer token.
- Uses Supabase Auth `getUser(token)` to validate the caller.
- Requires caller profile role=admin, active=true and membership_status=approved.
- Prevents self-deletion and deletion of another admin.
- Checks 23 owner/author/client references across PT, class, coffee, calendar, training, challenge and social-related data before calling Auth admin.deleteUser.
- Returns 409 and linked-history counts rather than deleting a user with detected references.
- Uses the server-side service-role key only inside the Edge Function; it is not returned to the client.
- Is deployed in TEST with JWT verification enabled.

A read-only TEST schema check confirmed all 23 configured reference columns and their queried `id` columns exist.

## Deployment gate
Do not deploy this function to Production during this audit. It must be deployed only after:
1. The Production-derived restore has the complete 46-table schema and required profile membership columns.
2. The Production forward-only migration reconciliation is rehearsed.
3. The new owner-admin account has been created and its login/approved role verified.
4. Function secrets/environment are checked and JWT verification is explicitly enabled.
5. Positive/negative function tests pass: no bearer token (401), invalid token (401), pending user (403), active member (403), manager (403), admin self-delete (400), admin-target delete (403), missing target (404), linked-history target (409), and eligible non-admin target deletion only in the isolated rehearsal.
6. The owner has given explicit final Production GO LIVE authorization.

Do not deploy `admin-create-user`; account creation remains disabled in-app.

## Music function
Production's `garasjegym-music` is deployed with `verify_jwt=false`, but its source manually validates the bearer token and checks active approved membership. The current Spotify component uses Spotify OAuth/API directly and the inspected Infotainment/Overview components do not invoke this Edge Function. Treat it as a legacy/unused deployment pending a full reference search; do not change or remove it in this phase.

## Production status
This inventory and source review are read-only. No Edge Function was deployed, replaced, disabled or deleted. Production remains NO-GO.
