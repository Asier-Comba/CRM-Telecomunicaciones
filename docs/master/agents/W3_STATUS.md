# W3 status — AI, assistant and integrations

## Current checkpoint — iteration 4.2

2026-09-27. W2 temporarily owns Backend/Data/Supabase and DB implementation.
W3 owns assistant/runtime contracts only. Issue #10 is the canonical coordination
thread; all technical handoffs are versioned here. PR #9 remains Draft/unmerged.

Live W4 PR14 review accepts exact canonical base
`6b0e30e7444de57100e4d983b3564a0c3b336b2c` for composition (CAN_INTEGRATE YES,
CAN_STAGE NO, CAN_PRODUCE NO). Do not repeat the old onboarding blocker.
W4 independently verified the capability output-schema fix at W3 `489eed2`
(384 official + 12 W4 tests); opaque ID ownership still needs authorization.
Old domain `e65f1e8` remains unaccepted. W2 takeover branch appeared and is replaying
domain work; latest exact checked snapshot is in ai/W3_TELECOM_V1_COMPATIBILITY_42.json.
At takeover `afe0a3a`, full telecom.v1 source and all14 signatures are identical to
e65f1e8; parser/read-boundary22/22 pass. Service implementation is still identical
to the unaccepted original; no real adapter is registered. Intermediate replay
snapshots with missing/narrower DTOs are superseded, not current regressions.

Delivered candidate changes:

- AuthorizedReconciliationService requires ReconciliationPersistence; no fallback
  to state-only reconciliation. One adapter call carries verified resolution,
  immutable binding/key/version, current principal and stable original audit intent.
  Successful completion no longer waits on the external audit sink.
- Result-reference authorization is required in addition to registered closed
  schemas. Missing callback, foreign IDs, getters/cycles/private/oversized structures
  reject before commit. W2 must repeat current authorization under its DB lock.
- Exact DB contract + machine-readable states/fields/uniqueness/transactions and
  SDK-free adapter interface in ai/W3_DURABLE_DB_CONTRACT_V1.md and
  src/assistant/durable-db-contract.ts. No schema, migration or SQL authored by W3.
- Executable native-process acceptance runner: 20-worker startup barriers,
  SIGKILL checkpoints, fresh-process recovery and closed effect/audit oracle.
  Aligned with W4 native suite at80b1a63: three races (including reconciliation),
  distinct pg_backend_pid identities, atomic op/outbox and lease/audit cutpoints.
  W2 supplies native PostgreSQL driver; W4 executes independently. Missing driver
  fails explicitly. No database acceptance or actual process race is claimed yet.
- Exact-SHA telecom.v1 signature/source comparison script. Missing or changed DTOs
  block integration; existing full parser/read boundary remains disconnected.

Evidence: lint/typecheck/build and **393/393 tests pass** after the new shared
runtime/oracle cases; JS runner syntax checks and a real child-process SIGKILL
protocol test pass (synthetic driver; not DB acceptance). First published checkpoint
`3c2d736` passed PR CI (4 successful, 2 skipped). Final checkpoint evidence follows
in PR #9. Skipped Dependency Review remains an owner configuration gate, no bypass.

Candidate runtime abstraction removes the separate state/terminal-audit call path;
this is NOT a durable DB implementation or W4 acceptance of end-to-end writes.
W4 independently verified the new seam/result authorization at515e0d4 (391 official
+6 W4 cases): prior core findings FIXED, Issue10 now remains for native durable
evidence. W4's P2 unknown-scenario oracle finding is addressed by explicit runtime
scenario allowlisting with a regression; independent recheck requested.
Reference Maps prove only in-process contract behavior. DB atomicity, multiprocess
restart/kill-after-effect and authorization still block mutations. No routes,
provider effects, production, merges, Supabase changes or UI v1 changes.

## Archived checkpoint — iteration 3.1

Verified 2026-09-26 UTC / 2026-09-27 Europe/Madrid. PR #9 remains Draft,
unmerged and disconnected from application routes. Local evidence: lint of 61
TypeScript files, typecheck/build and **384/384 tests pass**.

Latest inspected W1: canonical `32f0112`, telecom.v1 `e65f1e8`; W2 `db8ab41`;
W4 night-shift-v3 `fa7f889`, PR #16 and live Issue #10. No accepted integration
base. W1 PR #14/#15 SQL defects and W4's import-ledger bypass remain upstream
findings, not changes made by W3.

Delivered beyond remote checkpoint `91b4b3e`:

- Reconciliation now requires a registered per-capability output schema before
  completing an observed effect. Missing schema and arbitrary private fields fail
  closed. This addresses W4's new P1 candidate; independent review is pending.
- Full unknown-input telecom.v1 DTO parser with closed nested shapes, references,
  protected fields, capability ownership/actions/expiry and scope fences across
  awaits. Over 1,600 deterministic structural mutations exercise rejection.
- A server-only read boundary maps all 14 published operations, authorizes input
  references and requested audience before reads, parses output, reauthorizes
  returned references and minimizes model-visible selection data. No live adapter.
- Bounded acyclic read plans and executor; dependencies never auto-select ambiguous,
  partial, stale or denied results. Multi-turn ordinal/all selections reauthorize
  and recheck revocation/expiry after awaits. Production requires live scope/clock
  resolvers; in-memory handles are not durable memory.
- Structured factual claims bind exact source/operation/entity/value. Context
  budgets preserve partiality and reject inconsistent source counts. Semantic
  injection text remains untrusted data; this is not an arbitrary prose verifier.
- 122 executable reference semantic scenarios and 610 claim probes, separate from
  85 structured-input fixtures and the legacy 63-case catalog. No LLM was called;
  these numbers do not measure natural-language model accuracy.
- Provider-neutral benchmark and routing v2 measure separate plan/policy/grounding
  judgments, latency, reported token usage/fallback and configured cost estimates.
  No model vendor or price was selected without live evidence.
- Atomic reconciliation candidate, durable mapping manifest and crash matrix;
  typed service-principal/integration ingress with no external dispatch.
- Descriptor-based bounded structural scanning rejects cycles/accessors/deep
  payloads; regressions cover revocation during authorization and false emptiness.

**Remaining release gates:** the existing separate transition/audit service can
still lose the original audit event on sink failure. The new atomic interface and
Map simulations do not repair that service or prove database durability. Real
transactional adapter, process races/restarts, kill-after-effect, RLS/auth and live
provider evidence remain required. Writes remain disabled. Dependency Review's
owner configuration gate remains intact; no CI bypass or production changes.

Stable UI v1 contracts are unchanged. Current handoffs are W3_HANDOFF_W2_UI.md
and W3_HANDOFF_W4_SECURITY.md. Technical detail: ai/W3_ITERATION_31.md,
W3_ATOMIC_RECONCILIATION_CANDIDATE.md and W3_EFFECT_TRANSACTION_MATRIX.md.

## Archived checkpoint — telecom.v1 independent foundation

Verified 2026-09-26 UTC. PR #9 is still **Draft; do not merge**. Writes and route
integration remain disabled. No production, remote database or infrastructure changes.

Read live W1 `w1/canonical-v3@32f0112`, `w1/telecom-domain-v1@e65f1e8`
(PR #15), W2 `db8ab41`, W4 `5cb872c`, PR #9 and Issue #10. W4's
SYSTEM_STATE still describes older W1/W2/W3 snapshots: it is not evidence that
old findings remain in the new W1 canonical branch. No accepted integration SHA
has been published in the sources inspected.

Delivered:

- Exact 14 READ operation descriptors from W1 telecom.v1; all marked
  `published_contract_no_live_adapter`. No executable adapter registration.
- Closed inputs, bounded pagination/IDs/enums, Gregorian calendar validation,
  ordered date ranges and over 4,000 nested tenant-selector rejection checks.
- Exact frozen 18-kind W1 entity taxonomy. Kind validity never grants access.
- Server-issued ephemeral entity and continuation references: actor/workspace/
  session/epoch/expiry/provenance binding and exact operation/filter binding.
  These hold no business values; a fresh authorized read is still required.
- Bounded collection grounding projection with truthful completeness/freshness,
  protected-field masking and no cursor/reveal capability/provider error leakage.
  It requires validated authorized W1 DTOs upstream; it is not a full DTO parser.
- Reconciliation identity verification after writes, verifier mutation isolation,
  safe-integer versions and closed bounded verifier success envelope.
- W1 durable mapping compatibility assertions with unresolved transaction/API
  gaps explicitly recorded; no database adapter or durability claim.
- 85 new executable structured-input fixtures (37 accepted, 48 rejected) with
  Spanish intent prompts. Existing 63 semantic scenarios are retained.

Evidence: lint (34 TypeScript files), typecheck and build pass; **173/173 tests**
pass, including 85 individual structured-input cases. This is **not** an LLM
semantic benchmark, a live authorization test, or a production readiness claim.

Stable W2 contracts remain `AssistantResponse` v1 and `OperationStatusEnvelope`
v1, unchanged. Integration notes: `docs/master/ai/W3_TELECOM_V1_INTEGRATION.md`.
W4 review request is recorded in `W3_HANDOFF_W4_SECURITY.md`; no gate is cleared
by W3. Dependency Review remains an owner configuration gate if Dependency Graph
is disabled; no workflow or control was weakened in this checkpoint.

Next independent work: full W1 DTO parsing at the future adapter seam, semantic
plan/reference binding and multi-turn eval execution, then measured provider
benchmarks. Concrete model selection, live readers and durable adapters require
their explicit integration gates. Shared Project is secondary, never authority.

## Archived previous checkpoint — telecom.v0 (superseded above)

- Updated: 2026-09-26
- Branch: `w3/assistant-runtime-foundation`
- Pull request: `#9` targeting `w4/security-baseline` — **DRAFT, do not merge**
- Latest code checkpoint before this status: `90d670c`

## Isolation gate

The W3 foundation remains isolated. It will not be merged or wired into application routes until W4 publishes an `ACCEPTED INTEGRATION BASE` with the W1 workspace/authorization boundary. PR #9 remains draft.

W3 re-read `w1/bootstrap-sanitized@75c2103`, `w2/frontend-bootstrap-readiness@d1df763`, `w4/security-baseline@e33a07f`, PR #9 and Issues #10/#12. W1 has published stable `telecom.v0` presentation/read DTOs, but its SQL/domain implementation remains draft and W4 has not accepted the branch as an integration base. No production adapter, Supabase mutation, route wiring, merge or deployment was performed.

## Delivered in this cycle

### Secret-value boundary

- High-confidence value scanning now rejects bare Bearer/Basic credentials, authorization headers, AWS keys/session values, API/OAuth/access/refresh tokens, client secrets, passwords, session/cookie values, OpenAI/GitHub/Slack tokens, JWTs and private-key markers.
- Eighteen negative fixtures and ten telecom business-text controls cover the balance between leakage prevention and false positives.
- Synthetic secret fixtures are assembled from fragments at test runtime so the current tree contains no contiguous credential-like sample. Eight exact historical false-positive fingerprints from the first browser upload are narrowly triaged in `.gitleaksignore`; new or changed findings remain blocking.

### Durable operation contract

- Versioned interfaces define durable confirmation, idempotency and outbox records with explicit state machines and optimistic versions.
- Confirmation and idempotency bindings include actor, server-resolved workspace, capability and canonical argument digest.
- Idempotency states distinguish reservation, execution, observed effect, completion, retryable/terminal failure and reconciliation requirement.
- The outbox carries only an allowlisted dispatcher name plus an opaque server command reference; it cannot carry arbitrary browser URLs or provider payloads.
- A reusable adapter conformance harness covers 20-way atomic races, binding conflicts, store outage, retry, restart replay, post-effect uncertainty and one-effect outbox dispatch.
- The included reference adapter validates the contract/harness only. It is in-memory and is **not** a production persistence claim.

### Authorized reconciliation

- Reconciliation accepts a four-field closed request containing only an opaque operation reference, expected version, requested outcome and evidence reason.
- It requires `assistant:operation:reconcile`, server-authenticated actor/workspace context, exact workspace ownership and exact record version.
- A server verifier must prove an observed effect or verified absence; browser-supplied results and extra fields are rejected.
- Applied transitions use read-after-write verification and emit a redacted audit event. Inconclusive verification cannot force a terminal state.

### W2 operation status

- `OperationStatusEnvelope` v1 maps internal durable states to five public states: `pending`, `review_required`, `succeeded`, `failed_retryable`, `failed_terminal`.
- It exposes no workspace/actor IDs, idempotency key, argument digest, receipt, provider error or stored result.
- The only browser action is `refresh` while non-terminal. The browser cannot reconcile, retry, select a workspace or mark success.
- Full consumption guidance is in `W3_HANDOFF_W2_UI.md`.

### Telecom catalog and model routing

- A 13-entry semantic catalog maps customer, contract, commitment, renewal, service/line and dashboard-derived reads to exact W1 `telecom.v0` DTO references.
- All read entries are `mapped_no_adapter`; task/meeting writes are `blocked_on_w1_write_contract`. No operator/plan entity schema or handler was invented.
- The eval catalog now contains 63 cases across 45 semantic, failure and adversarial categories.
- Model routing uses measurable plan/result signals and configurable provider model IDs. Simple structured work, complex planning and long grounded summaries use separate lanes with bounded fallback, latency/token/cost telemetry and no prompt payload in telemetry.

## Current evidence

- `npm run lint`: pass (22 TypeScript files).
- `npm run typecheck`: pass.
- `npm test`: 62/62 pass.
- `npm run build`: pass through the test build.
- Eval catalog: 63/63 schema-valid cases; every required category represented.
- W2 compatibility matrix: 9/9 expected accept/reject decisions pass.

New direct tests include:

- bare secret values plus benign telecom controls;
- atomic confirmation/idempotency/outbox races;
- replay after simulated process restart;
- post-effect uncertainty to `reconciliation_required`;
- authorized, unauthorized, cross-workspace, inconclusive and tampered reconciliation;
- browser-safe operation status projection;
- W1-contract catalog mapping with blocked writes;
- bounded model fallback and cost telemetry.

## Cross-work coordination

### W1

Consumed only published `telecom.v0` read DTOs. Catalog entries remain disconnected until W4 accepts the W1 base and W1 publishes actual reader/service and write contracts. The durable conformance suite is ready for a future adapter without assuming its tables.

### W2

`AssistantResponse` v1 READ rendering remains stable. `OperationStatusEnvelope` v1 is now stable for opaque operation polling. Mutation execution remains disabled; `review_required` is display/poll only. W2 must not construct operation refs, retry operations or submit reconciliation outcomes.

### W4

The live Issue #10 review on 2026-09-26 accepted the previous core fixes and narrowed the remaining P0 to durable adapter/outbox/restart and authorized reconciliation evidence. This cycle supplies contracts, a reusable conformance suite, a reference implementation and the reconciliation service, but does not claim a production durable adapter. W4 review is requested against `W3_HANDOFF_W4_SECURITY.md` and `W3_DURABLE_ADAPTER_CONFORMANCE.md`.

## Open release gates

- No W4-accepted W1 integration base exists.
- No database-backed durable confirmation/idempotency/outbox adapter exists; cross-process/database-restart atomicity remains unproven.
- No live Supabase/RLS or production authentication evidence exists.
- W1 has no published write contracts for tasks/meetings or sensitive telecom mutations.
- Dependency Review remains an owner configuration blocker when its step is skipped because Dependency Graph is disabled. The owner must enable Dependency Graph and `DEPENDENCY_REVIEW_ENABLED=true`; W3 will not bypass the control.
- PR #9 remains draft and must not merge.

## Next safe work

1. Have W4 review the durable interfaces, conformance harness and server reconciliation boundary.
2. Register the accepted W1-backed adapter in the conformance suite after an integration base exists.
3. Bind catalog entries to real scoped readers only after their service contracts are published.
4. Run the 63-case eval set through real planner candidates and record quality/latency/token/cost observations before selecting concrete production models.
5. Audit/version n8n workflows only after the related capability contract and W4 infrastructure handoff exist.
