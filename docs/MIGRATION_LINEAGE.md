# STAMMORDNUNG 49 – installed migration lineage

Read-only reconciliation, 2026-11-26. Source snapshot: `7eee80e3e775471fd51f7bb15cfaae51f4e502c4`. Use the production project bound in KLARHEIT. This document is a provenance index, **not** a migration queue. Do not rename, rerun, squash or repair the installed migration history on the basis of a filename discrepancy.

The production migration ledger contained 179 entries. A filename-version scan across root, v2 and isolated fixture folders matched 168 timestamps (timestamp match alone is not proof of SQL equivalence). The remaining 11 were investigated against the actual stored SQL statements. Ten have one stored statement equal to the referenced file after trimming outer whitespace. One composite migration is only partially matched. No installed migration was changed.

| Installed version | Source path | Evidence |
|---|---|---|
| 20261121124105 | `v2/supabase/candidates/owner_first_signup_bootstrap_gate.sql` | Exact trimmed text |
| 20261121223022 | `v2/supabase/migrations/20261121223000_expand_trx_olympic_core_library.sql` | Exact trimmed text |
| 20261122101637 | `supabase/migrations/20261122101026_member_profile_name_and_public_pt_coaches.sql` | Exact trimmed text |
| 20261122105843 | `supabase/migrations/20261122105513_coffee_menu_and_member_cancellation.sql` | Exact trimmed text |
| 20261122205222 | `v2/supabase/migrations/20261122204937_notify_pt_service_requests_reliably.sql` | Exact trimmed text |
| 20261123132401 | `v2/supabase/migrations/20261123125000_group_result_notification_deep_link.sql` | Exact trimmed text |
| 20261123132452 | `v2/supabase/migrations/20261123135500_gg026_deduplicate_exercise_names.sql` | Exact trimmed text |
| 20261123134825 | `v2/supabase/migrations/20261123204500_pt_intake_request_to_existing_form.sql` | Exact trimmed text |
| 20261124055509 | `v2/supabase/migrations/20261124065100_pt_wod_results_feedback.sql` | Exact trimmed text |
| 20261124055539 | `v2/supabase/migrations/20261124070000_pt_feedback_rls_explicit_client.sql` | Exact trimmed text |
| 20261126150410 | `v2/supabase/preflight/ordnung006_shared_inventory_candidate.sql`, `ordnung006_assignment_schedule_candidate.sql`, `ordnung006_pt_result_provenance_candidate.sql` | Composite: result-provenance file is an exact substring; other two candidates differ from installed SQL. Installed SQL contains additional inventory detail and seed statements. Do not replay candidates over production. |

## Next acceptance checks

- Reconcile ORDRE006 actual SQL in a private backup, compare schema-only changes, reproduce on disposable local PostgreSQL 17, test access as member, manager, admin and unauthenticated. Keep production seed data out of public source.
- Reconcile remaining timestamp matches by content as needed; a filename match is not equivalence.
- Use the existing Safehouse/DATABUNKER tool on the owner's PC. The structural receipt checks and actual restore are different: verify SHA256SUMS, correct project, Auth/public data, source ZIP, and restore into a disposable local instance; never restore onto production merely to test. Do not commit the database dump or receipt containing personal data.
- Review advisor findings in a restricted channel. Do not revoke legitimate app RPC access or remove indexes on warning counts alone.

## Isolated verification

The exact installed ORDRE006 schema prefix (without production inventory seed) is now retained in `v2/supabase/preflight/ordnung006_installed_schema_rehearsal.sql`. [Run 45902426913](https://github.com/tibraxTIMB/Garasjegym/actions/runs/45902426913) passed the synthetic role checks and actual PostgreSQL 17 custom-format dump/restore. This resolves the schema-source gap for the excerpt; the production seed remains private and is not part of a public replay. Full production-role behavior and the owner's actual DATABUNKER are not certified by this test.
