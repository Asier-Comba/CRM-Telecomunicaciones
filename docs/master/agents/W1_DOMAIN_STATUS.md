# W1 Telecom domain v1 status

- Updated: 2026-09-26
- Branch: `w1/telecom-domain-v1`
- Dependency: draft PR #14 at `32f0112`; W4 acceptance pending
- Domain PR: #15, draft
- Supabase/production: untouched

## Delivered

- `customers` and separate `contacts`, with tenant-composite relationship,
  archive semantics, active assignment validation, indexes and forced RLS.
- Raw customer/contact relations have no browser grants; PII remains behind the
  future capability-aware reader.
- Provider-neutral operators, plans and immutable non-overlapping plan versions.
- `telecom.v1` read contract with truthful collection envelopes,
  `CustomerAttentionV1`, `DashboardV1`, protected fields and 14 READ services.
- Structural tests include negative controls and cumulative raw-grant checks.

## Evidence and limits

- 32/32 bootstrap/domain tests pass through the schema/catalog checkpoint.
- Telecom v1 contract tests: 6/6; typecheck and lint pass.
- PostgreSQL/Docker/Supabase CLI are unavailable locally. No zero-to-head or
  JWT/RLS runtime claim is made.
- Raw A→A is intentionally denied until a server-owned reader/command exists.
- Canonical roles are owner/admin/member/viewer; “manager” means admin in
  product prose. No database service principal exists yet.

## Next

Contracts/services/lines, permanence/renewal schema, then scoped read-model
implementation. Any W4 finding on PR #14 interrupts this branch.
