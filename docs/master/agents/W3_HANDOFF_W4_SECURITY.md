# Iteration6.0 candidate review request — independent gate stays open

CANDIDATE FIX: unbound in-flight reads now hold bounded revocation guards;
revokeSession/revokeEntity during await discards data and prevents new handles.
References include immutable source operation; ordinal frames reject mixed origins
and duplicate logical resources. New read-turn seam fences the planner await,
rejects unknown fields/SQL/writes/forged references, and uses one plan then typed
reads plus deterministic factual UI. No CRM output returns to a tool-calling model.
UI truncation now retains the v1 continuation shape without fabricating a cursor.

REPRO: npm run lint; npm run typecheck; npm test. Candidate414 tests pass locally.
New tests are deterministic source/runtime/IPC evidence, not LLM or native DB proof.
Process protocol explicitly versioned v2: four20-worker races, six transaction
rollback points, claim fences, lost commit reply/audit ACK, original event digests.
W2 platform PR19 now publishes8e978e0; no adapter/driver. C2 code/lease storage
correction independently replayed in PGlite by W3, not native acceptance. Native
conformance NOT RUN; Issue10 not closed.

LIMITATIONS: W4 unavailable; no independent acceptance of this new candidate.
No CAN_STAGE/CAN_PRODUCE claim, schema changes, routes, writes, merge or deploy.
Full current W2 handoff: W3_HANDOFF_W2_PLATFORM.md.

---

# W3 → W4 handoff — Assistant security review

## Current review request — iteration 5.0

CANDIDATE INTEGRATION READY. W2 read slice8de57dc accepted by W4 for composition;
W3 consumes exact W5 9f0e851 source (all14 readers) through SDK-free authorized
service injection and its own closed parser. Evidence is synthetic RPC replay,
not native PostgreSQL/Auth/RLS.402 local tests + lint/types/build PASS.

Review single-read-per-node metadata/grounding, async scope/reference/clock fences,
explicit ambiguity, denied-reference revocation, partial/exact count and renewal
reasoning, hostile business text as data, closed live-eval protocol and stable UIv1.
Dashboard UTC and team/personal attribution limitations remain visible. No routes,
model-selected IDs/authority/SQL/URLs, provider effects or assistant writes.

Prior output-schema, atomic runtime/result-auth and P2 unknown-scenario fixes were
independently accepted (including fd45ef8 oracle review). Do not reopen historical
findings by inertia. Issue10 remains native durable adapter/process/recovery gate.
W5 has not published that adapter; updated durable contract resolves legacy API
ambiguities but is not DB implementation. Only W4 decides acceptance/Issue10 close.
Live eval NOT RUN: reviewed provider module/credentials absent.24 cases are authored
synthetic references; stub tests never establish model accuracy.

## Archived iteration 4.2 review request

Update: W4 af02abc independently accepts seam/result authorization at W3 515e0d4
(391+6 tests). Keep only native durability gate open. P2 unknown scenario acceptance
in the report oracle has a candidate runtime allowlist fix + regression in this
checkpoint; please independently recheck. W2 handoff now also published on PR17.

Acknowledged live W4 verification: schema P1 FIXED at489eed2; canonical base
6b0e30e accepted for composition, not staging/production. Those are not open
findings by inertia. New CANDIDATE FIX at runtime abd5336/tests3c2d736 replaces
separate transition/terminal audit with mandatory atomic persistence port.

Repro targets: audit sink down after committed reconciliation now leaves original
intent and reports success without calling sink; lost commit response retains
intent; retry conflict cannot erase it; precommit failure changes nothing. In-memory
reference only. Inspect current port for full binding/key/version and current
transaction authorization. No state-only fallback. Opaque output IDs now require
authorizeResult; missing callback fails closed. Unsafe structures reject pre-clone.

Please independently re-run old audit-loss reproduction against the new required
port and verify rejection receipts/fake auditIntentPersisted flags. Real W2 DB
driver must pass scripts/durable-process-acceptance.mjs; W4 owns independent
native process/DB crash proof. See ai/W3_DURABLE_DB_CONTRACT_V1.md and
ai/W3_DURABLE_PROCESS_ACCEPTANCE_V1.md. Issue10 remains open; writes disabled.

## Archived review request — iteration 3.1

Read night-shift-v3 `fa7f889`, PR #16 and Issue #10. Your independently accepted
fixes at `91b4b3e` remain accepted findings; W3 does not reopen them by inference.
Local lint/typecheck/build pass; **384/384 tests**. PR #9 stays Draft.

Please review the new per-capability reconciliation output-schema registry:
missing schema or unknown private result fields cannot complete an operation.
Review telecom-dto-parser and telecom-read-boundary for recursive scope, protected
field/capability owner binding, expiry, authorized entity IDs and dashboard audience.
Both reference resolution and DTO parsing now recheck revocation after awaits.

Review semantic-read-plan/executor, reference-selection, claim-grounding and
context-budget. They reject fabricated IDs/capabilities, ambiguous dependency
selection and inconsistent empty evidence; no real reader is registered.

**Still open:** separate transition/audit failure can lose the original event.
atomic-reconciliation is a proposed transactional boundary with Map simulations,
not a durable implementation or a fix to the legacy service. No production
acceptance is requested on that basis. Durable mapping leaves physical columns
unassigned pending W1. IntegrationBoundary never sends; its eventual atomic
outbox must reauthorize principal/version and consume the bound confirmation.

See W3_ATOMIC_RECONCILIATION_CANDIDATE.md, W3_EFFECT_TRANSACTION_MATRIX.md and
ai/W3_ITERATION_31.md. Require real database/process-crash/RLS proof before enabling
writes. Dependency Review owner configuration remains a gate. Issue #10 stays open.

## Archived review request — telecom.v1 isolated checkpoint

Read W4 `5cb872c`, live PR #9 and Issue #10; no acceptance is inferred from
green unit tests. Please review new `telecom-input-validation.ts`,
`session-references.ts`, `grounding.ts`, `durable-compatibility.ts` and the
identity-bound reconciliation changes. Full suite: 173/173, lint/typecheck green.

Mandatory integration boundaries and unresolved issues:

- No model/client-selected scope; reference issuance only from validated
  authorized reader output; every resolution reauthorizes the resource.
- Session store is ephemeral, bounded per instance, and NOT durable memory.
  Use session-scoped allocation or introduce per-scope quotas before sharing a
  singleton; one session can otherwise exhaust the shared capacity.
- Grounding is an explicit safe projection, NOT a complete W1 DTO parser.
  Full output schema validation remains a required future adapter gate.
- W1 dashboard audience permission needs explicit review: its authorizer receives
  operation/context, not the requested audience. Do not equate valid enum with
  permission to see a team/workspace dashboard.
- Durable mapping is offline only. Confirmation CAS contract, operation/outbox
  atomicity, safe-result reference storage and transactional reconciliation audit
  remain unresolved. Operation lookup must be workspace-scoped, since W1's
  candidate uniqueness is `(workspace_id, operation_ref)`.
- No PostgreSQL/RLS/multiprocess/restart evidence or live provider execution.
  Reference-adapter simulated restart is not a durable database claim.

No CI bypass, ignore-list expansion, production action or permission widening.
PR #9 remains Draft and Issue #10 remains open for production evidence.

## Previous checkpoint details

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
