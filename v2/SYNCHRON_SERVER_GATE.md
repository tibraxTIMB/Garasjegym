# SYNCHRON – server integration gate
Status: design and tested in-process contract only. No database change, deployment, or live notifications approved under DOPPELADLER_MANDATE.md.

## Required host
- Reuse existing account authentication. Derive actor from verified access token on the server, never request JSON, user-editable metadata or UI role.
- Verify active membership, coach assignment and WOD visibility on creation. Recheck access and membership on every command/read, including after revocation.
- Persist session and invitation outbox atomically. Unique session ID and (session ID, recipient) key; duplicate same request returns same ID, conflict rejected. Dispatch only to recipient via existing notifications system; deliver/retry idempotently. No new anonymous public endpoints.
- Atomic compare-and-swap on session revision for every transition. Keep internal state private; return only actor-scoped projection. Do not expose full session, other doses, save tokens or service credentials to browser.
- Client adapter uses existing authenticated transport, not browser-local storage. No automatic repeat of a mutation with uncertain result; fresh snapshot and same request ID where appropriate.
- Reserve and write individual logs only server-side, using sealed payload and stable unique token per member/session. Verify RPC compatibility and receipts before enabling.
- Realtime should convey scoped state or invalidation only; reconnect fetches authoritative snapshot. Polling in dev panel is not a production scaling decision.
- Test on isolated test data with explicit permission, RLS/access and concurrent writes, revoked accounts, two real devices, notification retries, network loss, actual log idempotency and rollback. No migration or production deployment until reviewed.
- App runtime prop is null by default. Do not supply it until host authentication, atomic persistence, access controls and end-to-end tests are verified. Existing local workouts must not be replaced by a Synchron invitation. The runtime dispatcher supports create/snapshot/command only; server-side reserve and writer remain separate.
