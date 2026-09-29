# W3 iteration 3.1 integration guide

Status: isolated foundation; no production wiring. UI contracts remain v1.

## Read path

The semantic planner supplies an unknown structured graph to
`semantic-read-plan.ts`. Validation limits nodes, aliases, dependencies and typed
reference bindings. It accepts only W1's 14 published read operations, with no
model-provided workspace, SQL, HTTP, raw entity IDs or write operations.

`semantic-read-executor.ts` resolves trusted references and runs an injected safe
reader. Use `createTelecomReadBoundary` at that seam: validate arguments, authorize
the requested operation including dashboard audience, authorize input entities,
invoke the registered server reader, then parse and reauthorize every returned
reference. An enum is not an authorization grant. No adapter is registered here.

`telecom-dto-parser.ts` parses unknown values into frozen snapshots. Full entity,
summary/dashboard, collection, protected-field and capability shapes are closed.
The policy binds server scope, time, resource owner and permitted field/actions.
Supply live `currentScopeEpoch` and `currentNow` callbacks in production; snapshot
policy alone cannot detect external revocation. The bridge provides these hooks.
Validation is intentionally stricter than TypeScript DTO assignability.

The graph reader exposes only safe entity selection metadata. Full DTOs returned
by `readDto` are server-only and must not be serialized to the UI/model. Grounded
answers require the dedicated safe projection and checked structured claims.

## Follow-ups and grounding

`ConversationSelections` binds server-created ordered choices to scope, source
turn, kind and TTL. Ordinal/all resolution checks authorization, live scope,
frame/handle existence and expiry after every await. Supply a live `clock` in
production; invalidate frames/handles on resource or session revocation.

Claim verification covers exact fields, complete totals, truthful emptiness and
Gregorian day differences. It does not certify arbitrary generated prose.
Context budgeting prioritizes relevant customer/task evidence, preserves source
freshness/partiality and rejects inconsistent source counts before projection.
PII minimization is allowlisted projection, not a promise that arbitrary CRM text
contains no PII. Treat all CRM text as data, never instructions or tool authority.

## Evaluation and routing

122 authored semantic reference scenarios execute validated plans against synthetic
reader states, including 610 independent claim probes. The reference candidate
selects authored plans by case ID; it is not an NLP model. Keep reference/mock/llm
modes separate. Live model accuracy, token usage and pricing are still unmeasured.

The provider-neutral benchmark records plan, policy and grounding judgments,
failure rates, latency, reported tokens/fallback and configured cost estimates.
Adapters reporting fallback must report aggregate usage; estimates using one price
schedule are not vendor billing when fallback models differ. Missing usage is
explicitly incomplete. No prompts, result bodies or provider errors enter metrics.
Routing v2 chooses fast, reasoning or long-grounded lanes from bounded signals;
the actual provider/model configuration remains an evidence-based later decision.

## Persistence and integration gates

The atomic reconciliation candidate specifies transition + immutable original
audit event + audit outbox in one transaction. Simulations are not DB proof.
The existing separate transition/audit service still has an audit-loss failure
window. Do not enable it for writes or claim the candidate repairs it.

The mapping manifest checks W3 record coverage against published W1 semantics;
physical columns are deliberately null. Integration ingress accepts registered
references only. A future durable transaction must reauthorize current service
principal/version, bind command/confirmation, consume confirmation, reserve
idempotency and enqueue audit/outbox. No HTTP, keys or workflow execution exists.

See ../W3_EFFECT_TRANSACTION_MATRIX.md and ../W3_ATOMIC_RECONCILIATION_CANDIDATE.md.
