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

Reviewed head: `97e64d3` on 2026-09-25. The assistant runtime itself is unchanged from `2ecd254`; subsequent commits add lint, architecture/status documentation and restore the baseline ignore policy.

W3 may continue developing the isolated foundation. The findings below block merging or enabling assistant mutations; they do not block unrelated W1/W2 work.

### W3-SEC-001 — forgeable confirmation proof

- **Severity:** P0 release blocker for assistant mutations.
- **Evidence:** `confirmationMatches` only compares fields supplied in `CapabilityRequest.confirmation`; it does not verify a signature, query a server-issued record or consume `actionId`. The existing success test constructs the full proof in the caller. An adversarial run with an invented `actionId` and matching fields returned `SUCCESS`.
- **Risk:** a client, prompt-injected planner or replay can fabricate the approval object and bypass explicit human confirmation.
- **Affected component:** `src/assistant/contracts.ts`, `src/assistant/runtime.ts`.
- **Fix:** issue an opaque high-entropy confirmation server-side or authenticate the complete payload; persist its actor, workspace, capability, canonical arguments, short expiry and state; consume it atomically on execution.
- **Acceptance criteria:** invented, tampered, expired, reused, cross-actor and cross-workspace proofs fail; only a server-issued proof succeeds; proof succeeds at most once; TTL is bounded server-side.

### W3-SEC-002 — non-atomic idempotency

- **Severity:** P0 release blocker for assistant mutations.
- **Evidence:** the runtime performs `get`, executes the handler, then performs `put`. An adversarial `Promise.all` using the same workspace/capability/key executed the handler twice and returned two `SUCCESS` results. A `put` failure after a real side effect is caught as `INTERNAL_ERROR`, leaving a retry able to repeat the effect.
- **Risk:** concurrent requests, timeouts or partial failures can duplicate contracts, messages, billing operations or external automation.
- **Affected component:** `IdempotencyStore`, `AssistantRuntime.execute`, future handlers.
- **Fix:** atomically reserve a unique key before the effect, store pending/completed/failed state and bind the reservation to actor, workspace, capability and arguments digest. Use a transaction or durable outbox where the side effect requires it.
- **Acceptance criteria:** 20 concurrent identical requests execute the handler once; reusing a key with changed arguments returns `CONFLICT`; a crash after reservation and a failure after side effect have documented deterministic recovery tests.

### W3-QA-003 — resolved during review

- **Previous severity:** P1.
- **Evidence:** at head `2ecd254`, clean `npm run lint` failed because `scripts/lint.mjs` was absent. W3 added the source lint gate in `e4f168d`.
- **Verification:** at reviewed head `a284420`, a clean `bash scripts/ci/node-quality-gate.sh` passed lint, typecheck, nine tests, build and dependency audit.
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
