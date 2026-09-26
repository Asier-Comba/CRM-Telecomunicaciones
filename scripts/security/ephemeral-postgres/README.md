# Disposable SQL execution

Install here with `npm ci --ignore-scripts --no-audit --no-fund` (lockfile pins PGlite0.5.8).
Run `node run.mjs /absolute/path/to/reviewed-worktree` for identity onboarding/retry/suspension.
Run `node run.mjs /absolute/path/to/reviewed-worktree /absolute/path/to/supabase/tests/telecom-domain-rls.sql` for domain tests.
An optional third path injects a local reviewed SQL probe before the fixture's final rollback.

Only execute reviewed SQL. This runner has no database connection URL or credentials: each invocation creates a new in-memory PostgreSQL instance and closes it. Synthetic auth schema simulates `auth.uid()` using the session claim, not actual JWT verification. All target migrations apply verbatim; pgcrypto and btree_gist are explicitly loaded. No persistence, real users, remote Supabase or production operation.

This provides executable SQL/policy evidence, NOT independent-process races, native PostgREST, real JWT, Storage, remote integration, durable recovery or restore evidence. The package install accesses a registry; database execution is embedded and local.

Recorded 2026-09-26: PR14@32f0112 migrations pass; identity invocation fails42702. PR15@e65f1e8 migrations pass; official domain SQL fails42703 before extra import probe. Keep nonzero outcomes; never mark these gates passed.

`npm test` also snapshots the synthetic miniature database, checks a copied image checksum, loads it into a separate embedded instance and rechecks row contents and A/B denial. No snapshot leaves process memory. This is a regression for the harness, NOT a backup of CRM data, Storage/n8n recovery, PITR or a commercial RPO/RTO measurement. Local diagnostic candidate patches and the independent import reproduction are documented in tests/security/review-fixtures/README.md.
