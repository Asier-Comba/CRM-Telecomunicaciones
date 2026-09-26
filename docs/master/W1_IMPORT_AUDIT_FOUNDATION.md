# W1 import, audit and integration-principal foundation

- Status: offline design; no schema migration or runtime adapter yet
- Applies to: `telecom.v1`
- Remote Supabase and production: untouched

## Import boundary

The browser uploads a file to an approved private object boundary and receives
an opaque `source_file_ref`. It never inserts CSV rows into core relations. A
server command resolves the active workspace, creates the job and controls all
state transitions.

Candidate normalized relations:

| Relation | Purpose and mandatory invariants |
| --- | --- |
| `import_jobs` | workspace, creator, import kind, closed lifecycle, mapping version, opaque file ref, idempotency key, counters, checkpoint and timestamps |
| `import_field_mappings` | one target field per row, source column ordinal, allowlisted transform code; no executable expression |
| `import_staging_rows` | job/row identity, SHA-256 dedupe digest, encrypted payload reference or ciphertext, validation/application state; never plaintext PII JSON |
| `import_row_issues` | row, closed issue/severity/field codes and safe template code; no rejected raw value |
| `import_applications` | row, target kind/id, operation ref and applied timestamp; unique row application |
| `business_audit_events` | immutable actor/workspace/action/target/time/outcome/correlation refs and safe reason code |

Job lifecycle is closed and monotonic:

`uploaded → mapping → validating → ready → applying → completed`

`failed` and `cancelled` are terminal. Resume may continue only from a durable
checkpoint with the same workspace, file digest, mapping version and
idempotency binding. A row is applied once; retries return its existing target
reference. Batch failure never turns unapplied rows into success.

## Validation and deduplication

- Mapping names the exact target contract version and known fields.
- Transforms are catalog codes, never SQL, JavaScript, URLs or model output.
- Validation runs before core writes and records only safe issue codes.
- Dedupe uses keyed/canonical digests appropriate to each entity class. Raw
  email, phone, tax identifiers, contract references and line identifiers do
  not appear in logs or issue text.
- A dry-run produces counts and safe examples only; it grants no write
  capability.
- Application reauthorizes workspace and role, then uses closed domain commands
  rather than direct generic table insertion.

The storage/KMS choice for encrypted staging is a real infrastructure decision.
Until it is approved, W1 will not create a plaintext `jsonb payload` fallback.

## Business audit semantics

Audit events record actor kind and opaque actor ref, server-resolved workspace,
versioned action code, typed target kind/id, occurrence and recording times,
outcome, request/correlation refs and a safe reason code. They never contain:

- secrets or credential references that can be dereferenced by the browser;
- raw PII, prompts, document bodies or import rows;
- arbitrary metadata blobs;
- indiscriminate before/after snapshots.

Events are append-only. Corrections append a new event referencing the prior
event; update/delete are unavailable. Retention/export are separate privileged
capabilities and must preserve tenant isolation.

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
