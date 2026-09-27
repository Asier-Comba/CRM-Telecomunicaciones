# Disposable onboarding database test

Run `npm ci --ignore-scripts --no-audit --no-fund` in this directory and then
`npm run test:onboarding -- /absolute/path/to/repository`.

Every invocation creates a fresh in-memory PostgreSQL-compatible PGlite 0.5.8
database, installs the canonical migrations verbatim, creates only synthetic
auth users and closes the database. It has no database URL or remote credentials.

The checks cover first onboarding, replay, suspended and removed membership,
stale profile preference, transactional rollback after an injected failure and
two-workspace authority helpers. This is executable PostgreSQL evidence, but it
is not a claim about Supabase Auth, PostgREST, Storage, JWT verification, remote
RLS, independent-process concurrency, backup/restore or production readiness.

The isolated runner originated in W4's independent review harness and is kept
here as a reproducible W1 regression with the acceptance cases extended.
