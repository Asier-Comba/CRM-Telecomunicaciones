# Registered integration boundary

Status: isolated typed foundation; no live n8n workflow, provider transport, credentials or production adapter. `src/assistant/integration-boundary.ts` is not evidence of a durable delivery implementation.

The only model/browser request fields are `registeredIntegrationRef`, `registeredAction`, `commandRef`. Each resolves to server-owned registrations and prepared records. URLs, HTTP bodies, headers, workspace selectors, dispatchers, global keys and confirmation claims are rejected. Provider credentials remain in the registered server adapter, outside planner/model/UI DTOs.

The server authenticates a service principal and resolves actor, workspace, exact capability scopes, authority version, revocation and numeric expiry. No caller-provided principal is accepted by `enqueue`. The prepared command must bind to the same actor/workspace/integration/action and contain the approved argument digest. Inputs never select workspace. Numeric expiry is checked at millisecond precision, including the exact boundary.

Messaging lifecycle:

1. A server workflow prepares a draft and safe preview; neither can enqueue an effect.
2. A scoped authenticated review issues confirmation for the exact prepared command and digest.
3. `enqueue` validates registration, current principal and bound confirmation.
4. A future `AtomicIntegrationOutbox` adapter must reauthorize principal version/revocation, verify command/digest/confirmation, consume confirmation, reserve command idempotency, insert the durable command outbox and original audit outbox **in one transaction**. A concurrent retry returns the existing receipt. The boundary does not implement that transaction.
5. A separate authorized worker claims a registered command. Endpoints and provider payloads are resolved exclusively inside its registered adapter.
6. A verified opaque receipt and its original audit event persist atomically through the future delivery ledger. Ambiguous effects require reconciliation, never an automatic second send.

The browser receives only `pending` plus an opaque operation reference. Queuing is not delivery. A malformed receipt or transaction uncertainty returns bounded `UNAVAILABLE`; it does not authorize a retry with a fresh command or imply rollback.

Revocation and time-of-check changes must be fenced by the durable adapter at transaction commit, using `principalVersion`, current principal state and the transaction clock. The earlier resolver check alone is insufficient. Tests here prove fail-closed orchestration and closed types, not real atomicity, cross-process idempotency, JWT verification, or provider delivery. W4's durable integration gate remains open.

W4 owns infrastructure; no VPS, Docker, DNS, deployment or workflow configuration is changed. W1 must supply the accepted authority and durable persistence implementation before activation. W2 may render draft/preview/confirmation/pending states but cannot create authoritative service principals, registered commands or provider receipts.
