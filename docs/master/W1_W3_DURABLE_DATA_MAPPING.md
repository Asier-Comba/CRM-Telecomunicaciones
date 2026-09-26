# W1 mapping for W3 durable assistant operations

- Reviewed source: `w3/assistant-runtime-foundation@c6e869e`
- W3 contract: `src/assistant/durable-contracts.ts`
- Status: offline candidate only; no migration, adapter, route or production use

## Exact candidate mapping

| W3 record | Candidate W1 relation | Required identity and state |
| --- | --- | --- |
| `DurableConfirmationRecord` | `assistant_confirmations` | opaque operation ref, workspace, actor, capability, canonical argument digest, issued/expiry timestamps, optimistic version, exact W3 confirmation state |
| `DurableIdempotencyRecord` | `assistant_operations` | workspace-scoped idempotency key and binding, exact W3 operation state, attempt/version/lease, opaque receipt ref, safe result ref or safe failure code |
| `DurableOutboxRecord` | `assistant_outbox` | operation FK, allowlisted dispatcher, opaque command ref, exact W3 outbox state, attempt/version/lease and opaque receipt ref |
| `ReconciliationAuditEvent` | append-only business audit event | actor/workspace/request/operation refs, requested outcome, decision and closed reason code; no provider payload or result body |

Bindings are columns, not an arbitrary JSON authority blob. The server-resolved
workspace and actor are copied from authenticated context; model output and
browser bodies never select them. Canonical arguments are represented only by a
versioned digest. Provider payloads, prompts, secrets, raw PII and arbitrary
URLs are forbidden from all four records.

## Constraints and concurrency

- Unique `(workspace_id, operation_ref)` and
  `(workspace_id, capability, idempotency_key)` identities.
- Confirmation consume/cancel and operation transitions use compare-and-swap
  on `version`; exactly one concurrent transition may win.
- Outbox enqueue is atomic with the operation transition that creates the
  effect. Workers claim with version plus an expiring lease.
- `effect_applied` cannot be retried as if no effect occurred. Uncertain
  post-effect failures transition only to `reconciliation_required`.
- Reconciliation requires the W3 permission, exact workspace ownership,
  expected version, independent verifier evidence and read-after-write proof.
- All tables use forced RLS, immutable tenant/binding identity, explicit grants
  and an append-only redacted audit sink. A future service principal must be
  workspace-scoped, capability-scoped, revocable and auditable.

## Conformance plan before implementation

1. W4 publishes an accepted W1 integration base and reviews this mapping.
2. Create forward-only tables in a dependent branch; do not apply remotely.
3. Implement the W3 store interfaces without changing their states or
   transition decisions.
4. Run W3's durable adapter conformance suite against PostgreSQL, including
   20-way races, restart replay, binding conflict, lease expiry, one-effect
   outbox delivery and post-effect uncertainty.
5. Run A/B, suspended workspace, removed membership, anonymous and scoped
   service-principal attacks with real JWT/RLS behavior.
6. Prove backup/restore and retry behavior on an isolated database.
7. Request separate human authorization before any Supabase apply.

Until those gates pass, task/meeting writes and assistant side effects remain
blocked. The in-memory W3 reference adapter is evidence for semantics only, not
a persistence or production claim.
