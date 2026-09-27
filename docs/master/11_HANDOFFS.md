# 11 — Handoffs

- Updated: 2026-09-26
- Owner: W1
- Branch: `w1/canonical-v3`

## W1 → W2

Domain update (`w1/telecom-domain-v1`, dependent on PR #14):

- consume `src/lib/contracts/telecom-v1.ts` as a separate v1 parser;
- `CustomerAttentionV1`, `DashboardV1`, envelopes and field capabilities are
  now contract-complete but have no live reader yet;
- never infer raw-table access: customer/contact/operator/plan tables have no
  authenticated grants.

Snapshot revisado: `w2/frontend-bootstrap-readiness@13369ba`.

The stable presentation contracts remain `telecom.v0` in
`W1_DATA_CONTRACTS_V0.md` and `src/lib/contracts/telecom-v0.ts`. The current
branch is not yet an accepted integration base. W2 must not infer physical
tables or authorization from the UI snapshot.

`W1_SCHEMA_DRIFT_CLASSIFICATION.md` records the exact 29+1 gap. W2 should treat
Customer Attention, dashboard completeness/freshness and PII reveal/copy as
server capabilities, not inferred column access.

`W1_CUSTOMER_WRITE_INVENTORY.md` records every observed historical Customer
write and the transition gates. W2's collection envelope and portfolio
adapters are accepted as consumer requirements, not as physical schema or
write authorization. W1 must publish the final server-owned DTO/capabilities
before W2 connects live data.

The identity shell exposes a role only when both workspace and membership are
active. `profiles.workspace_id` is a preference and is accepted only when it
matches that authorized pair.

## W1 → W3

Domain update: `TELECOM_V1_READ_OPERATIONS` publishes 14 READ boundaries,
including `opportunity.list` plus the requested activity split. Map these in a
new W3 catalog version; do not mutate the existing v1 catalog. Task/meeting
writes remain blocked.

Snapshot revisado: `w3/assistant-runtime-foundation@c6e869e`.

Use `src/lib/server/tenant-context.ts` as the W1 actor/workspace boundary.
Workspace identifiers from model output or request bodies cannot replace the
resolved membership. Historical agent and confirmation routes are absent; no
arbitrary SQL/HTTP or global agent credential is enabled.

Assistant persistence remains classified, not implemented. W3 must provide the
durable confirmation/idempotency/outbox contract and entity taxonomy before W1
creates assistant tables or writes.

The current W1 `telecom.v0` read types may back W3's thirteen read capabilities
through a W1 adapter. Task/meeting mutations remain blocked: W1 has not
published a canonical write contract, and historical action routes are absent.

## W1 → W4

Review the new history from `w4/security-baseline@5cb872c`. The reconstruction
does not contain the prior W1 commits, archived infrastructure documents,
legacy migrations, live-patch scripts or privileged historical routes.

Review targets:

1. full-history value-redacted secret evidence and clean-clone gates;
2. tenant resolver fail-closed behavior;
3. `20260926143000_enforce_active_workspace_authorization.sql`, including all
   five helpers, membership policy and suspended-onboarding denial;
4. the 28-case tenant harness and real database RLS attacks once isolated
   infrastructure is authorized.

Publication evidence: draft PR #14 is open from `w1/canonical-v3`; its Linux CI
run passed baseline, lint/types/tests/build, migration policy and secret scan.
Dependency Review and Playwright were skipped because their documented
repository prerequisites are absent, not because those gates passed.

No migration has been applied and no production system has been touched.
