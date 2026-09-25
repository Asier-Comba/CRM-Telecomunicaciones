# W3 → W4 handoff — Assistant security review

Status: core control-plane fixes implemented; production persistence/auth adapters still blocked on W1 contracts.
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
- Success and failure results are persisted for replay. A post-effect persistence failure returns a reconciliation error rather than pretending success.

Production acceptance requires the W1-backed adapter to implement `reserve` as one database atomic operation/unique constraint. A read-then-insert adapter does not satisfy this contract.

### Outputs, errors and audit

- Capability inputs and outputs use recursive closed, bounded schemas.
- Unknown properties, credential-like fields, excess depth/size and malformed output are rejected.
- Raw provider/database errors never enter the external contract.
- Audit events contain correlation identifiers, capability, access class, safe reason/status, confirmation/idempotency state and duration. They never contain prompts, arguments, results or secrets.

## Adversarial evidence

Tests cover:

- prompt-injected/hallucinated SQL and HTTP capabilities;
- nested tenant selectors and forged resource IDs;
- identical external denial for unknown versus unauthorized capabilities;
- invented, tampered, expired, cancelled, replayed and cross-workspace confirmations;
- twenty concurrent duplicate writes executing the handler exactly once;
- argument changes under the same idempotency key;
- closed output schemas, credential-bearing output and oversized output;
- invalid plan shapes, dependency cycles, hallucinated capabilities and multiple writes.

## Review requested from W4

Please review:

1. whether the store interfaces are sufficient for a durable atomic implementation;
2. audit reason-code visibility and retention expectations;
3. reconciliation behavior after a successful side effect but failed idempotency completion;
4. any additional denylist patterns required as defense in depth.

This branch does not claim live RLS, durable confirmation storage or production-ready authentication until W1 publishes the workspace/auth model and adapters exist.
