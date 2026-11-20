# GO LIVE Phase B18 – Supabase backup capability and zero-budget recovery path

**Date:** 2026-11-20  
**Release:** SturmKopf Feuer 1.1  
**Decision:** NO AUTOMATED BACKUP / PITR COVERAGE ON CURRENT FREE PLAN; LOGICAL BACKUP PATH REQUIRED

## 1. Organization plan verified

The connected Supabase organization record reports:

- Organization: `tibraxTIMB's Org`
- Plan: `free`
- Tier: `tier_free`

Supabase's current Database Backups documentation states that automatic daily backups are provided for Pro, Team and Enterprise projects. Free-tier projects should regularly export data with the Supabase CLI `db dump` command and maintain off-site backups. The Production Checklist likewise says database backups are not available for download on Free.

Supabase documentation also states that PITR is an add-on for Pro, Team and Enterprise plans and requires at least a Small compute add-on. PITR therefore conflicts with the project's zero-budget constraint unless the owner explicitly changes that constraint and approves the cost.

Sources:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://supabase.com/docs/reference/cli/supabase-db-dump

## 2. Important correction to Wave 0 assumptions

The missing backup evidence is not merely an unqueried dashboard field. On the currently verified Free organization plan, Supabase does not provide the normal downloadable daily backup facility or PITR add-on.

The recovery path that respects the current budget is a manually generated logical backup using Supabase CLI, plus a separate export/backup of Storage objects. A logical database dump is not equivalent to a provider-managed physical backup/PITR and must be tested by restoring into a disposable isolated Postgres/Supabase environment before it can satisfy the release recovery gate.

The existing test project is not an acceptable restore target for production data unless a separate, approved privacy and data-handling decision is made. Test contains application test data and a different schema history; never overwrite it or mix production member data into it casually.

## 3. Zero-budget backup procedure prepared for owner workstation

Do not put production dumps in GitHub, commit them to the repository, upload them to a public location or send them in chat. Dumps can contain personal information, training history, PT notes and other private member data.

On a trusted workstation with the Supabase CLI installed:

1. Authenticate with `supabase login` using the owner's own account.
2. Link the CLI to production project `kultdmklwmilhoytrrig` and enter the database password only into the CLI prompt (never into chat or GitHub).
3. Export the database schema and data using the documented `supabase db dump` command. Store the files outside the repository in an encrypted local/off-site backup location with restricted access.
4. Export Storage bucket objects separately; a database dump contains Storage metadata, not the underlying object files.
5. Record the UTC timestamp, CLI version, project ref, dump file sizes and SHA-256 checksums. Keep the checksum manifest with the backup, but keep the dump itself private.
6. Restore the logical dump into a disposable isolated environment and run integrity checks, application smoke tests and row-count comparisons.
7. Preserve the original backup untouched and retain a second copy in a separate secure location.

For a production logical dump, use the CLI's `db dump` command and explicitly target the linked production project; review the CLI reference before execution. Do not use `db reset --linked`, `db push`, or any command that writes to the linked production project as part of the backup.

## 4. Restore rehearsal acceptance criteria

A logical dump is not considered a valid recovery point until all of these pass:

- Dump completes with zero errors and non-empty expected schema/data artifacts.
- SHA-256 checksums verify after copying to the second secure location.
- Restore completes in an isolated disposable environment.
- Public schema objects, functions, triggers, policies, grants and migration history are checked.
- Row counts and selected integrity invariants match the source snapshot.
- Auth data and Storage objects are either restored by an approved documented method or explicitly excluded with a tested user/session recovery plan.
- The app connects to the restored environment using isolated credentials.
- WOD selection, training history, PRs, PT bookings/notes, class bookings, member access and relevant Storage media pass smoke tests.
- No connection string, database password, service-role key or personal member data is committed to GitHub or shared in chat.

## 5. Cost decision

No plan upgrade, PITR add-on, compute upgrade, new Supabase project or development branch was created. No cost was incurred by this phase.

If the owner later prefers provider-managed daily backups/PITR, obtain a live cost quote first and require explicit approval. Current Free tier does not satisfy the provider-managed backup/PITR gate.

## 6. Execution boundary and result

Only the organization plan was read and current Supabase documentation was reviewed. No production data was exported, no CLI was run from the connected environment, no restore was performed and no database or deployment changes were made.

**B18 result:** The current Free plan explains why automated backup/PITR evidence is unavailable. A zero-budget logical dump plus separate Storage export and isolated restore rehearsal is the viable next path. Wave 0 remains NOT PASSED until that owner-workstation procedure is executed and validated. Release remains **NO-GO**.
