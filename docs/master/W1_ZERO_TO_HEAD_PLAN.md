# W1 zero-to-head and restore plan

- Migration order is the lexicographic order in `supabase/migrations`.
- All current migrations are forward-only and transactional.
- Automatic destructive down migrations are forbidden for production.

## Current manifest

1. `20260925153500_core_tenant_identity.sql`
2. `20260926120000_atomic_workspace_onboarding.sql`
3. `20260926143000_enforce_active_workspace_authorization.sql`
4. `20260926160000_telecom_customer_contacts.sql`
5. `20260926161000_telecom_operator_plan_catalog.sql`
6. `20260926162000_telecom_contract_service_portfolio.sql`
7. `20260926163000_telecom_commercial_operations.sql`
8. `20260926164000_telecom_service_cases_documents.sql`

## Isolated database gate

When PostgreSQL/Supabase local runtime is available, CI must create an empty
database, apply the manifest once, verify catalogs/constraints/indexes/policies,
apply it again through the migration runner to prove idempotent bookkeeping and
load synthetic A/B/C tenant fixtures.

Required attacks cover anonymous, active owner/admin/member/viewer, removed
membership, suspended workspace, multi-workspace actor and the future scoped
service principal. The current slice tests the complete 17-relation read matrix
plus representative INSERT/UPDATE/DELETE/upsert and cross-tenant FK attacks.
The final gate must extend mutation coverage to every mutable tenant relation
and prove tenant/creator mutation plus concurrency invariants.
Plan ranges, primary contacts, renewals, task versions, activity targets and
outbox/idempotency races receive dedicated concurrent tests.

`supabase/tests/telecom-domain-rls.sql` now supplies the first executable DB
slice. Run it only after applying the manifest to an isolated database:

```powershell
$env:TELECOM_TEST_DB_HOST = '127.0.0.1'
$env:TELECOM_TEST_DB_PORT = '5432'
$env:TELECOM_TEST_DB_NAME = 'telecom_test'
$env:TELECOM_TEST_DB_USER = 'postgres'
$env:TELECOM_TEST_DB_PASSWORD = '<PASSWORD>'
pnpm test:db:rls
```

The target must be a disposable Supabase-compatible database already
bootstrapped with the Supabase roles and `auth` schema, named with an `_test`
suffix, with the canonical manifest applied zero-to-head. The connection role
must be local superuser (recommended: disposable local `postgres`) or
explicitly hold `BYPASSRLS`, privileges on `auth.users` and the tested objects,
plus permission to `SET ROLE` to `authenticated`/`anon`. Ownership alone is
insufficient because the domain tables use `FORCE ROW LEVEL SECURITY`; the
runner checks the superuser/BYPASSRLS condition server-side before fixtures.
The normal Supabase local database named `postgres` does not meet this
isolation contract: clone/bootstrap a separate `telecom_test` database or use
the equivalent ephemeral CI image first.

The runner accepts only discrete connection settings, refuses non-loopback
hosts and database names without `_test`, removes inherited libpq overrides,
keeps the password out of process arguments and performs the same host/name
checks server-side before marking the session `app.environment=test`. The SQL
checks that marker again, uses only synthetic `.invalid` identities, makes
policy-testing grants transactionally and ends with `ROLLBACK`. It is prepared
evidence, not a green runtime claim until the command executes successfully on
isolated PostgreSQL after zero-to-head migration apply.

## Restore strategy

Before any authorized remote apply, capture and verify a provider backup plus a
schema-only export and record the exact migration head. Recovery restores to a
new isolated project/database, reapplies only forward repairs after the restored
head, runs the same catalog/RLS attacks and swaps traffic only after human
approval. A failed migration transaction is rolled back; a committed migration
is repaired with a new forward migration, never edited or reversed in place.

No remote apply, restore, traffic switch or destructive rollback is authorized
by this document.

`reserve_invoice_number` remains deferred. Billing has no accepted v1 invoice
contract, so recreating the legacy RPC merely to reduce the drift counter would
introduce an unsupported invariant.
