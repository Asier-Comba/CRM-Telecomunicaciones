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

## Isolated database gate

When PostgreSQL/Supabase local runtime is available, CI must create an empty
database, apply the manifest once, verify catalogs/constraints/indexes/policies,
apply it again through the migration runner to prove idempotent bookkeeping and
load synthetic A/B/C tenant fixtures.

Required attacks cover anonymous, active owner/admin/member/viewer, removed
membership, suspended workspace, multi-workspace actor and the future scoped
service principal. For every tenant table test SELECT/INSERT/UPDATE/DELETE,
cross-tenant FK attempts, tenant/creator mutation and concurrency invariants.
Plan ranges, primary contacts, renewals, task versions, activity targets and
outbox/idempotency races receive dedicated concurrent tests.

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
