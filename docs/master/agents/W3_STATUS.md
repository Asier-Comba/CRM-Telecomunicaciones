# W3 status — AI, assistant and integrations

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
