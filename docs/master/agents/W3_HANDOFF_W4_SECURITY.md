# W3 → W4 handoff — Assistant security review

Status: previous core findings accepted in live Issue #10 review; review requested for new durable contract, conformance harness, reconciliation service and secret-value coverage.

Scope:

- `src/assistant/durable-contracts.ts`
- `src/assistant/reconciliation.ts`
- `src/assistant/operation-status.ts`
- `src/assistant/schema.ts`
- `test/support/durable-conformance.ts`
- `test/durable-conformance.test.ts`
- `test/schema.test.ts`

## What is implemented

### Durable contract and conformance suite

- Confirmation consume/cancel is a versioned, atomic, terminal transition bound to actor/workspace/capability/argument digest.
- Idempotency reserve/start/effect/complete/fail/retry/reconcile transitions are explicit. An expired `executing` or `effect_applied` lease becomes `reconciliation_required`, never an automatic retry.
- Completed results survive adapter restart and replay without a second effect.
- Outbox enqueue is unique per operation; claim is versioned and the 20-worker race permits one winner/effect.
- Outbox commands contain an allowlisted dispatcher plus opaque server command reference, not arbitrary URLs/HTTP/SQL/provider payloads.
- The reusable harness can be registered by a future database adapter. The current reference adapter preserves backing state across a simulated restart but remains in-memory test evidence, not production durability.

### Reconciliation security boundary

- Only a server-authenticated actor with `assistant:operation:reconcile` can request reconciliation.
- The workspace comes from server context. Record ownership and exact expected version are checked before verification.
- The request is closed and accepts no workspace, result, provider payload or arbitrary reason.
- A server verifier must return `effect_applied`, `effect_absent` or `inconclusive` based on read-after-write/provider evidence.
- `effect_applied` can complete only with verified structured capability output. `effect_absent` can produce a retryable/terminal failure only with the matching reason. Inconclusive evidence preserves `reconciliation_required`.
- Every evaluated path emits a redacted event containing identifiers, requested outcome, decision and bounded reason code. It contains no prompt, arguments, result or provider failure text.

### Browser operation status

- The UI projection exposes an opaque operation ref and public state only.
- Internal workspace, actor, argument digest, idempotency key, receipt, stored result and failure code are omitted.
- `review_required` exposes only `refresh`; there is no browser action for reconciliation or forced completion.

### Secret-value scan

- Negative fixtures now include bare `Bearer <opaque>` and AWS secret assignments highlighted by W4, plus Basic, API/OAuth tokens, passwords, sessions/cookies, OpenAI/GitHub/Slack tokens, JWTs and private keys.
- Benign fixtures cover telecom plan names, authorization prose, CIF values and company names containing “Bearer”.

## Evidence

- 62/62 unit tests pass.
- Durable conformance runs eight adapter-independent behaviors, including three 20-way races and restart replay.
- Six dedicated reconciliation tests cover verified completion, verified absence, permission denial, cross-workspace denial, malformed/forged payloads, inconclusive evidence and audit outage.
- Secret scanner has 18 reject and 10 accept fixtures.

## Explicit non-claims

- No database-backed durable adapter exists.
- No cross-process or database-restart test has run.
- No live RLS, service-principal or application-route integration has run.
- The reference adapter is not suitable for production.
- PR #9 remains draft and unmerged.

## Review requested

Please validate:

1. the state machines and atomic method boundaries in `durable-contracts.ts`;
2. whether the reusable conformance suite is sufficient to accept a future W1-backed adapter and which database-crash points must be added;
3. the server-only reconciliation permission, evidence mapping, redacted audit and read-after-write rules;
4. the outbox command boundary and whether worker identity/lease ownership needs an additional persisted field;
5. the operation-status non-disclosure and browser action policy;
6. the expanded secret-value patterns and benign controls.

Production acceptance remains blocked until the accepted W1 base supplies a real adapter that passes this suite across independent processes/restart plus W4's live tenant/auth tests.
