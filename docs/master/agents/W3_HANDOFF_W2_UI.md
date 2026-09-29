# Current iteration6.0 UI handoff

`AssistantResponse` v1 and `OperationStatusEnvelope` unchanged.
`runTelecomReadTurn` returns server-only `assistant.read-turn.v1` with an ordered
array of existing UI v1 responses plus internal execution metadata; no route yet.
Render coverage and factual detail responses together, in order. Factual table
rows carry source operation/section, entity, field, value, freshness and as_of.
Null is unknown; partial/stale/unsupported is not empty. Truncated output uses
`continuation:{}` when there is no approved next page: never synthesize a cursor.
Render business text as escaped plain text, never HTML/Markdown/instructions.
Do not send internal execution metadata as authority or convert entity IDs into
authorized navigation. Ambiguous dependent reads get an AMBIGUOUS response; server
selection frames/opaque references remain subject to fresh authorization.
SessionReferenceStore.issueEntity now requires sourceOperation; this is an internal
server API change, not a UI v1 schema change. No writes/provider sends enabled.
Current platform dependency: W3_HANDOFF_W2_PLATFORM.md.

---

# W3 → W2 handoff — Assistant UI contract

## Iteration 5.0 — current stable handoff

W2 returns to frontend; W5 owns DB/services. UI v1 stays unchanged.
`telecom-ui-composer.ts` emits a validated AssistantResponse v1 table from the
authorized read slice: section, observed count, source descriptor, completeness,
freshness and as-of; unavailable counts are null. Dashboard includes the source
timezone as a notice (currently UTC, not implicitly Europe/Madrid). No new top-level
citations field, model HTML, arbitrary URL or navigation permission is introduced.
Structured disambiguation remains server-issued entity choices; opaque follow-up
references must be resolved/reauthorized server-side. Expiry/revocation during
await discards evidence. Routes and writes remain disabled.

Exact source compatibility includes W5 9f0e851 (all14 methods), with team dashboard
and personal unattributed renewal/permanence restrictions preserved. Local402 tests
PASS. See W3_HANDOFF_W5_PLATFORM.md and W3_TELECOM_READ_MATRIX_V1.json. Candidate
integration, not production approval; W4 independent review requested on PR9.

## Archived iteration 3.1 handoff

`AssistantResponse` v1 and `OperationStatusEnvelope` v1 remain unchanged. No new
browser transport, navigation taxonomy, mutation handler or interactive control
is enabled. Read graph outcomes and structured claims are backend intermediate
types; do not consume them as an undocumented UI v2.

Ambiguous reads require an explicit selection. Server-issued choice frames bind
order, entity kind, source turn, actor/workspace/session/epoch and expiry. Ordinal
or all selections must be resolved and reauthorized server-side; browser ordering
cannot redefine a frame. A route adapter is still pending acceptance.

Display partial, stale, unavailable and denied states faithfully. A budgeted row
count is not a total; omitted rows cannot become evidence of absence. Only checked
claims may feed a grounded final answer. This checkpoint does not provide a live
LLM presenter. Continue using the stable READ structures below.

## Previous telecom.v1 checkpoint

Consumed W2 `db8ab41` and W1 `e65f1e8`. `AssistantResponse` v1 and
`OperationStatusEnvelope` v1 remain unchanged. W1's exact 18 entity kinds now
live in `src/assistant/entity-kinds.ts`; module/navigation routes are NOT inferred
from that list. Inject only route taxonomy accepted by W1/W4.

Collection grounding preserves available/unsupported/unavailable/not-authorized/
error, partiality and stale timestamps. Only fresh authorized complete zero-item
collections permit an empty claim. A bounded projected row count is never the
total customer/service/line count. Customer Attention sections stay independent.

Session and continuation references are server-issued ephemeral handles. Never
manufacture a handle or derive one from a raw ID; never reuse across a changed
scope epoch, operation, filter or page size. The reference store is backend-only;
there is no new browser transport or enabled mutation action in this checkpoint.
Full boundaries: `docs/master/ai/W3_TELECOM_V1_INTEGRATION.md`.

## Existing stable contract (unchanged)

Status: stable READ foundation contract; telecom taxonomy remains blocked on an accepted W1 base.
Contract: `AssistantResponse` version `1` in `src/assistant/ui-contract.ts`.

Operation status: version `1` in `src/assistant/operation-status.ts`.

## Stable READ subset

W3 considers the following version-1 subset stable for W2 READ rendering:

- the complete envelope: `contractVersion`, `answer`, `status`, `grounded`, closed `blocks` and closed `meta`;
- statuses produced by READ execution, including safe failures and partial/ambiguous states;
- `notice`, `table`, prompt-only `followUps`, and text-only streaming deltas;
- `entities` and `navigation` only when validated against an injected W1-owned taxonomy;
- structured blocks only in a validated `final` stream event.

Confirmation-card shape is stable as a transport contract, but mutation UI remains disabled until W4 accepts durable confirmation/idempotency adapters. Page-context input and canonical telecom navigation values are deferred to the accepted W1 application contract.

## Safe to consume now

W2 can render these validated structures without parsing Markdown:

- `answer`, `status`, `grounded` and bounded `meta`;
- tables with closed columns, scalar cells, explicit ISO currency codes, optional unique `rowIdentity` and required continuation metadata when truncated;
- non-executing follow-ups (`suggestion` or `refine` only);
- safe notices with stable code and retryability;
- confirmation cards containing an opaque `confirmationId`, expiry, risk and exactly `confirm`/`cancel` actions;
- separate streaming events: `started`, bounded `answer_delta`, `final`, `cancelled`, `failed`.

Structured blocks become interactive only from the validated `final` event. Delta events contain text only.

## Stable operation-status subset

W2 may also consume the closed `OperationStatusEnvelope` for an operation reference already returned by the server. It exposes only:

- an opaque `operationRef`;
- public state: `pending`, `review_required`, `succeeded`, `failed_retryable` or `failed_terminal`;
- `terminal`, `resultAvailable`, `updatedAt` and a bounded polling interval when applicable;
- a safe notice for failed operations;
- exactly one browser action, `refresh`, and only while work is pending or under server-side review.

It never exposes workspace/actor IDs, idempotency keys, argument digests, provider receipts, internal failure text or stored results. The status lookup must authorize the opaque reference against the server-resolved workspace before projection. The browser cannot submit a reconciliation result, mark an operation complete, choose a workspace or manufacture a retry. `review_required` means the UI may keep polling and show a neutral review message; only the authorized server reconciliation service can resolve it.

## Confirmation lifecycle

The frontend must treat `confirmationId` as an opaque server reference. It must never decode, construct, extend, validate or modify it.

1. A write preview returns `CONFIRMATION_REQUIRED` and a pending confirmation card.
2. Confirm sends the exact opaque ID with the original operation reference to the server.
3. Cancel invokes the server cancellation path.
4. Expired, invented, altered, replayed or cross-actor/workspace IDs return `INVALID_CONFIRMATION`.
5. The UI disables both actions after the first terminal response and does not retry confirmation with a new payload.

Follow-up suggestions are prompts, never implicit writes. Any later write still traverses planner, validation, capability authorization and confirmation policy.

## Taxonomy and navigation

`AssistantUiTaxonomy` is injected into validation and is a closed registry of `modules` and `entityTypes`. W3 will populate canonical values only after W1 publishes the entity and route taxonomy.

Until then:

- W2 may implement generic answer, notice, confirmation, follow-up and table renderers;
- W2 must not hardcode conceptual entity names from the eval catalog;
- entity references and navigation targets remain disabled unless their values exist in the injected registry;
- every navigation destination reauthorizes server-side; an entity reference is never proof of access.

## Table identity and continuation

- A `rowIdentity.key`, when present, must name a declared column and every row value must be unique.
- A truncated table must include `continuation` with an opaque cursor and/or total.
- Cursors are display/continuation references, not authorization grants.
- Row ordering and filtering are server-produced. Refinement creates a new assistant request; the browser does not reorder evidence and imply a new grounded answer.

## Compatibility rule

Reject unknown contract versions and unknown fields. Additive changes that require new fields will publish a new contract version or a documented compatibility change before W2 consumes them.

## W2 fixture review

W3 reviewed W2 fixture source `d1df763` and committed an executable compatibility matrix at `evals/ui/assistant-read-contract.v1.json`.

- W2 accept fixtures need the required `contractVersion: 1` and matching `meta.taxonomyVersion`.
- A truncated table needs a `continuation` descriptor.
- An entity absent from the injected taxonomy is rejected; it is not silently downgraded.
- Evidence blocks on `grounded: false` are rejected; W2 must not accept then hide an invalid server envelope.
- `followUps.kind: "action"` is rejected. Follow-ups are prompt-only `suggestion`/`refine` controls.
- Secret-bearing keys/values and incomplete envelopes are rejected.

All nine reconciled decisions execute in the unit suite. W2 can copy the accepted synthetic cases without enabling writes.
