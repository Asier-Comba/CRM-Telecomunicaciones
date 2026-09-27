# W1 import, audit and integration-principal foundation

- Status: canonical schema prepared in `20260926165000_import_audit_foundation.sql`; no upload/apply runtime adapter yet
- Applies to: `telecom.v1`
- Remote Supabase and production: untouched

## Import boundary

The browser uploads a file to an approved private object boundary and receives
a server-issued UUID reference. It never inserts CSV rows into core relations. A
server command resolves the active workspace, creates the job and controls all
state transitions.

Canonical normalized relations:

| Relation | Purpose and mandatory invariants |
| --- | --- |
| `import_jobs` | workspace, creator, import kind, closed lifecycle, mapping-contract version, UUID file/idempotency refs, versioned source-file HMAC, counters, checkpoint and timestamps |
| `import_field_mappings` | one target field per row, source column ordinal, allowlisted transform code; no executable expression |
| `import_staging_rows` | job/row identity, domain-separated keyed row HMAC, encrypted-payload UUID reference and validation/application state; never plaintext PII JSON |
| `import_row_issues` | row, closed issue/severity/field codes and safe template code; no rejected raw value |
| `import_applications` | row, exactly one explicit target FK, operation UUID and applied timestamp; unique row application |
| `business_audit_events` | immutable actor/workspace/closed action/typed target/time/outcome and UUID refs; successful targets must exist in the same workspace |

Job lifecycle is closed and monotonic:

`uploaded → mapping → validating → ready → applying → completed`

`failed` and `cancelled` are terminal and cannot be resumed. A replay with the
same workspace/idempotency UUID returns the existing job; a genuinely new
attempt requires a new idempotency UUID and is outside this schema-only slice.
A row is applied once and its durable application returns the existing target
reference. Batch failure never turns unapplied rows into success.

## Validation and deduplication

- Mapping names the exact target contract version and known fields.
- Transforms are catalog codes, never SQL, JavaScript, URLs or model output.
- Validation runs before core writes and records only safe issue codes.
- Dedupe uses versioned, domain-separated HMAC-SHA-256 over canonical input and
  includes workspace/job scope. Raw
  email, phone, tax identifiers, contract references and line identifiers do
  not appear in logs or issue text.
- A dry-run produces counts and safe examples only; it grants no write
  capability.
- Application reauthorizes workspace and role, then uses closed domain commands
  rather than direct generic table insertion.

The storage/KMS choice for encrypted staging is a real infrastructure decision.
Until it is approved, W1 will not create a plaintext `jsonb payload` fallback.

## Business audit semantics

Audit events record actor kind and UUID actor ref, server-resolved workspace,
closed versioned action code, typed target kind/id, occurrence and
database-assigned recording times, outcome, UUID request/correlation refs and
a closed reason code. `succeeded`/`no_effect` targets are existence-checked in
the same workspace. They never contain:

- secrets or credential references that can be dereferenced by the browser;
- raw PII, prompts, document bodies or import rows;
- arbitrary metadata blobs;
- indiscriminate before/after snapshots.

Events are append-only. Corrections append a new event referencing the prior
event with the same workspace, target and action and non-decreasing event time;
update/delete are unavailable. Retention/export are separate privileged
capabilities and must preserve tenant isolation.

All six relations have forced RLS and raw grants revoked. Import internals and
audit reads are owner/admin-only; audit append accepts an active user actor but
the raw table remains inaccessible until a server command grants a narrowly
scoped execution path. The migration does not create an upload endpoint,
private bucket, KMS integration, generic writer or service principal.

The `activities` relation is a presentation timeline, not the compliance audit
log. Its closed `summary_code` renderer cannot replace business audit evidence.

## Future service principals

A service principal belongs to exactly one workspace and has status
`active | suspended | revoked`. Capabilities are normalized child rows with an
optional expiry. Credential material lives in an approved secret store; the DB
keeps only an opaque credential version/ref and its rotation/revocation time.

Every request must authenticate the principal server-side, bind the configured
workspace, check one declared capability, rate-limit, emit audit and enforce
idempotency where effects exist. A global secret plus caller-selected
`workspace_id`, `service_role` as product identity, arbitrary SQL and arbitrary
HTTP are forbidden.

No service-principal tables or grants are created until W4 accepts the tenant
base and the authentication/rotation mechanism is chosen.
