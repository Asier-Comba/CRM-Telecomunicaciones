# W3 → W4 handoff — Assistant security review

Status: framework findings through W4 `e33a07f` addressed; production persistence/auth adapters and cross-process evidence remain blocked on an accepted W1 base.
Scope: `src/assistant/*`, `test/runtime.test.ts`, `test/plan.test.ts`.

## Security invariants implemented

### Tenant and authorization

- Actor and workspace exist only in server-created `ExecutionContext`.
- Nested tenant/workspace selectors in model or client inputs are rejected.
- A capability needs both a declared permission and its deterministic resource authorizer before execution.
- Unknown capabilities and known-but-forbidden capabilities return the same external body. The distinct reason remains only in the redacted audit event.
- Capability schemas reject keys resembling credentials.

### Confirmation

- The caller supplies only an opaque `confirmationId`; it cannot supply confirmation claims.
- Issuance binds actor, workspace, capability and SHA-256 of canonical arguments with a five-minute expiry.
- Consumption and cancellation are one-time state transitions performed by `ConfirmationStore`.
- Invented, altered, expired, cancelled, replayed and cross-actor/workspace confirmations fail closed.

### Idempotency

- Every write requires a bounded idempotency key.
- `IdempotencyStore.reserve` is the atomic pre-effect boundary, bound to actor, workspace, capability and argument digest.
- Concurrent, conflicting and completed requests have separate deterministic results.
- Success and failure results are persisted for replay. Every reservation has a bounded lease. A post-effect completion failure returns a reconciliation error, remains non-executable during the lease and transitions to `reconciliation_required` after expiry instead of remaining pending forever or repeating the effect.
- Reconciliation is explicit: an authorized worker/operator records the observed terminal result against the reservation, after which normal retries replay it. The core never guesses whether an external effect happened.

Production acceptance requires the W1-backed adapter to implement `reserve` as one database atomic operation/unique constraint. A read-then-insert adapter does not satisfy this contract.

### Outputs, errors and audit

- Capability inputs and outputs use recursive closed, bounded schemas.
- Capability contract v3 requires an explicit raw-provider-to-DTO projector before validation.
- Unknown properties, credential-like fields, high-confidence secret values, excess depth/size and malformed output are rejected.
- Raw provider/database errors never enter the external contract.
- Audit events contain correlation identifiers, capability, access class, safe reason/status, confirmation/idempotency state and duration. They never contain prompts, arguments, results or secrets.
- Confirmation cancellation and audit-sink outages return bounded retryable errors rather than escaping as rejected promises/raw failures.

## Adversarial evidence

Tests cover:

- prompt-injected/hallucinated SQL and HTTP capabilities;
- nested tenant selectors and forged resource IDs;
- identical external denial for unknown versus unauthorized capabilities;
- invented, tampered, expired, cancelled, replayed and cross-workspace confirmations;
- twenty concurrent duplicate writes executing the handler exactly once;
- twenty distinct valid confirmations raced under one idempotency key executing the handler exactly once;
- argument changes under the same idempotency key;
- store failure before reservation producing zero effects;
- post-effect completion uncertainty, lease expiry, explicit reconciliation and replay without a second effect;
- same-key cross-actor conflict and independent cross-workspace execution;
- cancellation-store and audit-sink outages;
- explicit DTO projection plus credential material in allowed string values;
- closed output schemas, credential-bearing output and oversized output;
- invalid plan shapes, dependency cycles, hallucinated capabilities and multiple writes.

## Review requested from W4

Please review:

1. whether the leased reservation/reconciliation contract is sufficient for a durable outbox adapter;
2. audit reason-code visibility, retention and the desired delivery guarantee when the audit sink is unavailable;
3. whether source DTO projection plus the current high-confidence patterns have an acceptable false-positive/false-negative balance;
4. the exact cross-process/restart suite required once W1 provides an accepted durable boundary.

This branch does not claim live RLS, durable confirmation storage, cross-process atomicity or production-ready authentication. In-memory evidence closes framework behavior only. PR #9 must remain draft and unmerged.
