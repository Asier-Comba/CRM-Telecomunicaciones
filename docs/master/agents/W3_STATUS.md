# W3 status — AI, assistant and integrations

Updated: 2026-09-25
Branch: `w3/assistant-runtime-foundation`
Pull request: `#9` targeting `w4/security-baseline` — **DRAFT, do not merge**
Latest local delivery: `3440ff6` (`feat(assistant): harden control plane contracts`)
Last verified remote checkpoint: `190a615`; local and remote trees matched at `cd1e4030`.

## Isolation gate

The W3 foundation remains intentionally isolated. It will not be rebased, merged or wired into the imported application until W1 publishes and W4 accepts all of:

- a canonical integration base;
- canonical telecom entity/service contracts;
- workspace membership and authorization contracts;
- the corresponding testable schema/RLS boundary.

W1 now publishes `W1_STATUS.md` and PR `#11` with the historical application bootstrap. Its own data-model document still marks telecom design as pending, canonical migrations are empty, and workspace/auth contracts are not published. Therefore the gate is not satisfied and W3 has not adapted conceptual telecom capabilities.

## Delivered in this cycle

- Capability contract version 2 with recursive closed input/output schemas, deterministic resource authorizers, tenant policy, risk class, confirmation and idempotency contracts.
- Server-issued opaque confirmations bound to actor, workspace, capability and canonical argument digest, with five-minute expiry and one-time consume/cancel transitions.
- Atomic idempotency reservation interface before write effects, deterministic in-progress/conflict/replay behavior and persisted terminal failure behavior.
- Identical external response for unknown and unauthorized capabilities; distinct reasons are retained only in redacted audit events.
- Recursive size/depth/property validation, prototype-key safety and rejection of credential-like schema fields.
- `AssistantResponse` contract version 1 with closed taxonomy injection, notices, exact table descriptors, ISO currency semantics, row identity, continuation, non-mutating follow-ups and opaque confirmation cards.
- Separate streaming envelope; structured controls appear only in the validated final event.
- Eval catalog expanded from 18 to 27 cases, including arbitrary SQL/HTTP requests, forged IDs, invented/tampered confirmations, duplicate writes and hallucination pressure.
- Deterministic eval aggregation for capability, arguments, entity, grounding, action success, hallucination, latency, tokens and cost.
- Stable handoffs published in `W3_HANDOFF_W2_UI.md` and `W3_HANDOFF_W4_SECURITY.md`.

## Adversarial coverage

The 27-test suite includes:

- prompt injection and hallucinated capabilities;
- nested workspace/tenant selectors and forged resource IDs;
- unknown versus unauthorized capability non-enumeration;
- malformed structured plans, arbitrary SQL/URL fields, dependency cycles and multiple writes;
- invented, changed, expired, cancelled, replayed and cross-actor/workspace confirmations;
- twenty concurrent requests with one idempotency key executing the handler once;
- changed arguments under a reused idempotency key;
- unknown, credential-bearing, oversized and structurally invalid outputs;
- UI version/taxonomy/table/continuation/follow-up/stream validation.

## Cross-work coordination

### W1

Read `origin/w1/bootstrap-canonical@3e21e32`, `W1_STATUS.md`, `03_DATA_MODEL.md` and `11_HANDOFFS.md`. The bootstrap is useful provenance, not yet the telecom/auth contract required for integration. W3 will read and map published contracts rather than infer schema from historical code.

### W2

Read `origin/w2/frontend-bootstrap-readiness@06861e3` and its assistant handoff/spec. All additive requests that are independent of W1 are addressed in response contract v1. Canonical `module` and `entityType` values remain an explicit W1 dependency. W3 owns server confirmation lifecycle; an HTTP endpoint adapter is deferred until the accepted app/auth base exists.

### W4

Read `origin/w4/security-baseline@44375b0`, `W4_STATUS.md` and the detailed security handoff. The P0 confirmation and idempotency findings and P1 output/enumeration findings are fixed in the framework-independent core and have adversarial unit evidence. Durable stores, live RLS and auth integration remain release gates and are not claimed.

## Historical migration decisions

Retain as concepts: semantic structured planning, typed capability ontology, scoped readers, preview/confirmation/idempotency, reference-only conversation memory, read-after-write verification and eval-driven changes.

Do not migrate as architecture: regex as intent engine, duplicated planner/detector paths, n8n as semantic brain, arbitrary SQL/HTTP tools, model-selected workspace or UI behavior inferred from Markdown.

## Known blockers

- W1 canonical telecom migrations, role model, workspace resolution and service contracts are not yet published/accepted.
- No test Supabase environment is available; W3 makes no live RLS claim.
- The prior Dependency Graph block no longer reproduces on PR #9: the latest Dependency Review job passed. W3 did not change repository settings or bypass the control.
- PR #9 remains draft by explicit coordination decision.

## Validation evidence

- `npm run lint`: pass (12 TypeScript files).
- `npm run typecheck`: pass.
- `npm test`: 27/27 pass.
- `npm run build`: pass.
- `bash scripts/ci/test-guardrails.sh`: pass.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- GitHub PR #9: 5 successful checks, 1 expected skipped check; all checks passed while the PR remains draft.
