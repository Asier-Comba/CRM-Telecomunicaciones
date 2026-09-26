# 11 — Handoffs

- Updated: 2026-09-26
- Owner: W1
- Branch: `w1/canonical-v3`

## W1 → W2

Domain update (`w1/telecom-domain-v1`, dependent on PR #14):

- consume `src/lib/contracts/telecom-v1.ts` as a separate v1 parser;
- `CustomerAttentionV1`, `CustomerSummaryV1`, `DashboardV1`, portfolio DTOs,
  envelopes and field capabilities are contract-complete;
- the authorized read-service boundary is available for adapter work, but its
  database repository and routes are not live;
- service cases and document metadata now have canonical normalized tables;
  legacy `entity_files` browser writes are not a compatibility contract;
- never infer raw-table access: all 17 domain tables have no authenticated
  grants.

Snapshot revisado: `w2/frontend-bootstrap-readiness@db8ab41`.

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

Inputs now publish bounded portfolio/date/owner/assignee/status filters. The
service rejects unknown properties and any caller-provided `workspace_id`,
authorizes the exact operation before persistence and checks the returned
scope epoch. W3 should target the v1 envelopes, never the repository directly.

Snapshot revisado: `w3/assistant-runtime-foundation@c6e869e`.

Use `src/lib/server/tenant-context.ts` as the W1 actor/workspace boundary.
Workspace identifiers from model output or request bodies cannot replace the
resolved membership. Historical agent and confirmation routes are absent; no
arbitrary SQL/HTTP or global agent credential is enabled.

Assistant persistence remains unimplemented. The reviewed W3 durable contract
is mapped offline in `W1_W3_DURABLE_DATA_MAPPING.md`; no table or write is
created before W4 accepts the base and the conformance plan can run on an
isolated database.

Import/audit and future scoped integration-principal boundaries are specified
in `W1_IMPORT_AUDIT_FOUNDATION.md`. This is not permission to publish writes;
plaintext staging payloads, global integration secrets and caller-selected
tenants remain prohibited.

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
   infrastructure is authorized;
5. dependent PR #15's 17-relation domain harness and support-domain migration,
   without treating it as part of the frozen PR #14 review target.

Publication evidence: draft PR #14 is open from `w1/canonical-v3`; its Linux CI
run passed baseline, lint/types/tests/build, migration policy and secret scan.
Dependency Review and Playwright were skipped because their documented
repository prerequisites are absent, not because those gates passed.

No migration has been applied and no production system has been touched.
