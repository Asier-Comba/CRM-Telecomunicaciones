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
- Contracts, services, lines, explicit commitments and renewal windows with
  tenant-composite integrity and clock-derived commercial states.
- Opportunities, tasks, meetings and append-only activity codes. Tenant and
  creator identity are immutable; task versions are server-managed; activity
  text is rendered from a closed code catalog rather than stored free text.
- `telecom.v1` read contract with truthful collection envelopes,
  full portfolio DTOs, `CustomerAttentionV1`, `DashboardV1`, protected fields,
  bounded filters and 14 READ services.
- `AuthorizedTelecomReadServiceV1` now centralizes closed-input validation,
  per-operation authorization, scope-epoch checks and safe error reduction.
  Its injected persistence repository is still unimplemented.
- Structural tests include negative controls and cumulative raw-grant checks.

## Evidence and limits

- Targeted portfolio/operations/contracts/read-boundary tests pass; the exact
  full-suite count is recorded in PR #15 CI rather than duplicated here.
- PostgreSQL/Docker/Supabase CLI are unavailable locally. No zero-to-head or
  JWT/RLS runtime claim is made.
- Raw A→A is intentionally denied. The server orchestration boundary exists,
  but no database repository adapter or route is live.
- Contract references and line identifiers remain deliberately unbacked until
  protected storage and reveal/copy auditing are defined.
- Canonical roles are owner/admin/member/viewer; “manager” means admin in
  product prose. No database service principal exists yet.

## Next

Implement the database-backed v1 read repository only after an isolated
zero-to-head database can prove SQL/RLS behavior. Continue import/audit and W3
durable mapping offline. Any W4 finding on PR #14 interrupts this branch.
