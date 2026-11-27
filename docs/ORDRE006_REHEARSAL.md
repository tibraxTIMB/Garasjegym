# ORDRE006 installed schema rehearsal

Source: installed migration 20261126150410 (read-only inspection). The isolated rehearsal contains the exact schema prefix before the inventory seed. No production inventory seed, accounts or logs are included. The workflow tests staff, manager, active/inactive/unrelated member and anon against synthetic fixtures and restores a synthetic custom-format PostgreSQL 17 archive. Existing role helpers and base tables in the fixture are simplified, so this is not proof of full production-role behavior or a successful DATABUNKER recovery. Never run the preflight on production. No release or migration is authorized by this PR.

## Results

- [Rehearsal run 45902426913](https://github.com/tibraxTIMB/Garasjegym/actions/runs/45902426913): passed both role assertions and synthetic custom-format dump/restore.
- [Candidate build 45902434517](https://github.com/tibraxTIMB/Garasjegym/actions/runs/45902434517): passed; unrelated migration jobs skipped by design.
- Merged PR #12: `ec81d35d2d344538a7dce7dbdf37900a7e2cb479`.
- No production backup was restored, and no production database was changed.
