# W3 handoff — assistant control plane

Severity: **P0 release gate for assistant mutations**
Evidence: the repository contained no agent/tool implementation at W4 baseline creation.
Risk: prompt injection or hallucinated identifiers could cross tenant boundaries, invoke arbitrary integrations or perform unconfirmed writes.

## Required fix

- Define each tool with a strict schema and server-side capability check.
- Resolve workspace and resource ownership independently of model arguments.
- Replace arbitrary SQL/URL execution with parameterized operations and destination allowlists.
- Bind confirmations to user, workspace, action, canonical arguments and short expiry.
- Add idempotency keys and postcondition/audit events for mutations.
- Treat retrieved content, imports, webpages and tool output as untrusted prompt material.

## Acceptance criteria

- Prompt-injection tests cannot change workspace, tool, URL, SQL or confirmation state.
- Hallucinated and cross-tenant IDs return a stable denial without revealing existence.
- Replayed or altered confirmations fail.
- Retried writes are idempotent.
- The model cannot access service-role credentials or arbitrary network destinations.
- Every mutation emits a redacted audit event with actor, workspace, tool, outcome and correlation ID.

## Review of `w3/assistant-runtime-foundation`

Reviewed head: `7be1e8f` on 2026-09-25. The newer eval metrics do not change the mutation runtime or contracts (their Git blob IDs are identical to `9ef926b`), so Issue `#10` remains unresolved.

W3 may continue developing the isolated foundation. The findings below block merging or enabling assistant mutations; they do not block unrelated W1/W2 work.

### W3-SEC-001 — forgeable confirmation proof

- **Severity:** P0 release blocker for assistant mutations.
- **Evidence:** `confirmationMatches` only compares fields supplied in `CapabilityRequest.confirmation`; it does not verify a signature, query a server-issued record or consume `actionId`. The existing success test constructs the full proof in the caller. Against the unchanged runtime reviewed through `7be1e8f`, W4 supplied an invented, never-issued `actionId` with matching fields; all 20 concurrent requests returned `SUCCESS`.
- **Risk:** a client, prompt-injected planner or replay can fabricate the approval object and bypass explicit human confirmation.
- **Affected component:** `src/assistant/contracts.ts`, `src/assistant/runtime.ts`.
- **Fix:** issue an opaque high-entropy confirmation server-side or authenticate the complete payload; persist its actor, workspace, capability, canonical arguments, short expiry and state; consume it atomically on execution.
- **Acceptance criteria:** invented, tampered, expired, reused, cross-actor and cross-workspace proofs fail; only a server-issued proof succeeds; proof succeeds at most once; TTL is bounded server-side.

### W3-SEC-002 — non-atomic idempotency

- **Severity:** P0 release blocker for assistant mutations.
- **Evidence:** the runtime performs `get`, executes the handler, then performs `put`. Against the runtime unchanged through `7be1e8f`, an adversarial `Promise.all` of 20 requests using the same workspace/capability/key executed the handler 20 times and returned 20 `SUCCESS` results. A `put` failure after a real side effect is caught as `INTERNAL_ERROR`, leaving a retry able to repeat the effect.
- **Risk:** concurrent requests, timeouts or partial failures can duplicate contracts, messages, billing operations or external automation.
- **Affected component:** `IdempotencyStore`, `AssistantRuntime.execute`, future handlers.
- **Fix:** atomically reserve a unique key before the effect, store pending/completed/failed state and bind the reservation to actor, workspace, capability and arguments digest. Use a transaction or durable outbox where the side effect requires it.
- **Acceptance criteria:** 20 concurrent identical requests execute the handler once; reusing a key with changed arguments returns `CONFLICT`; a crash after reservation and a failure after side effect have documented deterministic recovery tests.

### W3-QA-003 — resolved during review

- **Previous severity:** P1.
- **Evidence:** at head `2ecd254`, clean `npm run lint` failed because `scripts/lint.mjs` was absent. W3 added the source lint gate in `e4f168d`.
- **Verification:** at `9ef926b`, a clean `bash scripts/ci/node-quality-gate.sh` passed lint, typecheck, thirteen tests, build and dependency audit. `7be1e8f` adds only eval metrics; no new CI run was available at the time of this review.
- **Remaining hardening:** add a negative lint fixture/rule test when the canonical application adopts its final lint stack.

### W3-SEC-004 — output policy is denylist-based

- **Severity:** P1 before real capabilities are registered.
- **Evidence:** handler output is cast to `StructuredValue` and returned without runtime schema validation. UI validation searches serialized output only for keys containing `token`, `secret` or `authorization`; common sensitive names such as password, cookie, session and API key are not a complete boundary.
- **Risk:** a provider response or handler regression can expose credentials or excessive tenant data to the model/UI.
- **Affected component:** capability contract, runtime result handling, UI contract.
- **Fix:** require a closed, bounded output schema per capability, project provider responses into explicit DTOs and apply centralized redaction/size limits. Treat denylist checks only as defense in depth.
- **Acceptance criteria:** tests reject unknown fields, credential variants, excessive rows/depth/bytes and raw provider errors before output reaches the model or UI.

### W3-SEC-005 — capability enumeration mismatch

- **Severity:** P2 hardening.
- **Evidence:** an unknown capability returns `NOT_FOUND` before authorization, while a registered capability without permission returns `FORBIDDEN`; the current test name claims non-disclosure but tests only the registered case.
- **Risk:** unauthorised callers can distinguish registered capability names.
- **Affected component:** `AssistantRuntime.execute` error ordering.
- **Fix:** use one external denial response where capability visibility matters, while retaining a redacted internal audit reason.
- **Acceptance criteria:** unauthorized requests receive the same external status/body for unknown and forbidden capabilities.

## Exact acceptance suite for Issue #10

PR `#9` remains blocked until the following tests are committed, reproducible and green. Passing lint/build or planner validation is not a substitute.

### Confirmation issuance and consumption

1. A structurally valid but never-issued proof with invented `actionId` is rejected without handler execution.
2. Tampering actor, workspace, capability or arguments digest independently is rejected.
3. Expired proofs and proofs whose requested lifetime exceeds the server maximum are rejected.
4. A valid server-issued proof succeeds once; sequential replay is rejected without handler execution.
5. Twenty concurrent executions using one proof consume it once and execute the handler once.
6. A proof issued in Workspace A is rejected in Workspace B even for the same actor and arguments.

### Atomic idempotency

1. Twenty concurrent requests with one actor/workspace/capability/key/digest execute the handler once; followers receive the stored result or a deterministic pending response.
2. Reusing the key with changed arguments returns `CONFLICT` and never executes the handler.
3. Reusing the key under a different actor or workspace cannot read the original result or suppress an authorized independent operation.
4. Reservation-store failure occurs before the handler and produces zero side effects.
5. Handler failure and retry follow one documented state transition without duplicating a completed effect.
6. Crash/recovery between external effect and completion record is covered by a durable transaction/outbox integration test before any external-write capability ships.

### Closed output boundary

1. Every capability declares a closed output schema; unknown keys fail before model/UI exposure.
2. Credential-like keys including `password`, `apiKey`, `cookie`, `session`, `token`, `secret` and `authorization` fail regardless of casing.
3. Maximum bytes, nesting depth, collection length and row count are enforced.
4. Raw provider errors, headers and response bodies are mapped to stable safe errors.
5. Output containing a foreign workspace resource is rejected by the scoped adapter before serialization.

W4 will rerun these tests and independent forged-proof, replay, concurrency and cross-workspace attacks. The `CHANGES_REQUESTED` review is removed only after reproducible evidence at the current PR head.

## Revalidation at `w3/assistant-runtime-foundation@190a615`

### Core fixes accepted

- Caller-created confirmation claims were replaced by server-issued opaque IDs bound to actor,
  workspace, capability and canonical argument digest with expiry and one-time consume/cancel.
- Idempotency now exposes an atomic `reserve` boundary before the handler and binds actor,
  workspace, capability and digest.
- Capability resource authorization is deterministic and server-side; unknown and forbidden
  capabilities share one external denial.
- Input/output schemas are recursive, closed and bounded. The clean branch passes lint, typecheck,
  27 tests, build and dependency audit; GitHub CI run `#56` is green.
- W4 independently raced 20 distinct valid confirmation IDs using one idempotency key. Exactly one
  handler execution and one success occurred; the other 19 requests returned in-progress.

The original invented-proof and in-process concurrent-double-execution exploits are therefore closed
for the framework core. This does not approve production mutation integration.

### Issue #10 items still open

- Stores remain interfaces plus in-memory test doubles. No durable W1-backed adapter proves atomic
  consume/reserve across processes, restarts or database failures.
- W4 forced idempotency completion to fail after the handler effect. The effect executed once, the
  response became `idempotency_commit_failed`, and retry remained `idempotency_in_progress` forever.
  A durable outbox/reconciliation/lease or other deterministic recovery transition is still absent.
- A confirmation cancellation store failure escapes as a rejected promise rather than a bounded
  safe result and audit outcome.
- Closed property schemas do not prevent secret material inside an allowed string. A synthetic
  `Authorization: Bearer ...` value in an allowed `note` field passed validation. Source-specific
  projection/redaction is mandatory; add high-confidence value detection as defense in depth.
- The durable adapter suite must include store failure before handler, handler failure transitions,
  audit/store outage, crash/restart, replay, concurrency and cross-actor/workspace attacks.

PR `#9` remains `CHANGES_REQUESTED`. W3 may continue safely on its branch.

Head `a57641a` changes documentation only. Its statement that Dependency Review now passes is
misleading: in CI run `#56`, the job wrapper passed but `Review dependency changes` was skipped;
only the readiness-report step ran. This does not close the Dependency Graph/repository-variable gate.
