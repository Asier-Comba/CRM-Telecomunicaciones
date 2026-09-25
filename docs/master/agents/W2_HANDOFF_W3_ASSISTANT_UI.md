# W2 → W3 handoff — assistant structured UI contract

- Date: 2026-09-25
- W2 branch: `w2/frontend-bootstrap-readiness`
- W3 source reviewed: `w3/assistant-runtime-foundation` at `7be1e8f`
- Current contract: `src/assistant/ui-contract.ts`
- Status: v1 is usable for presentation design; additive clarifications requested before product integration

## Accepted W3 foundation

W2 will consume `AssistantResponse` as a structured contract and will not parse Markdown to infer entities, tables, navigation, permissions or write actions.

The following v1 blocks map cleanly to frontend responsibilities:

| W3 block | W2 presentation |
| --- | --- |
| `answer` | Primary assistant prose |
| `entities` | Compact entity references/cards |
| `table` | Responsive structured result table |
| `followUps` | Suggested prompts/refinements |
| `navigation` | Product navigation resolved through an internal route registry |
| `confirmation` | Explicit action preview requiring a separate confirmation interaction |
| `meta` | Request correlation and partial-result feedback; never normal user copy |

W2 accepts the current bounds of 50 entities, 20 columns, 100 rows and 6 follow-ups as transport ceilings. The UI may render lower display limits and expose deliberate expansion/pagination.

The structured-plan validator and eval metrics added through `7be1e8f` are compatible with this boundary and do not change the UI response shape. The detailed consumption design now lives in `docs/master/W2_ASSISTANT_RENDERER_SPEC.md`.

W4's P0 findings on server-issued confirmations and atomic idempotency, plus its P1 finding on closed output schemas, are explicit production integration gates. W2 will not expose an enabled mutation confirmation control until they are resolved and accepted.

## Status-to-UI mapping

| `ResultStatus` | Default UI treatment | Primary action |
| --- | --- | --- |
| `SUCCESS` | Answer plus structured blocks | Contextual navigation/follow-up |
| `EMPTY` | Neutral no-results state | Refine query or navigate to module |
| `PARTIAL` | Visible partial-result notice; keep valid evidence | Retry/refine when safe |
| `AMBIGUOUS` | Choice/clarification state | Select one interpretation/entity |
| `NOT_FOUND` | Requested entity/result not found | Search/refine |
| `FORBIDDEN` | Permission-safe denial without resource existence detail | Navigate away or contact admin when applicable |
| `CONFIRMATION_REQUIRED` | Confirmation card, never success styling | Confirm or cancel |
| `INVALID_CONFIRMATION` | Expired/changed confirmation state | Regenerate preview |
| `INVALID_INPUT` | Recoverable request issue | Edit/refine |
| `CONFLICT` | Current state changed | Refresh evidence and retry |
| `POLICY_BLOCK` | Clear policy boundary | Offer safe alternative if supplied |
| `UNAVAILABLE` | Temporary dependency failure | Retry later |
| `INTERNAL_ERROR` | Generic safe failure with request reference | Retry/support path |

`grounded=false` must never display evidence-like entity/table blocks as authoritative unless W3 explicitly defines a safe degraded rule.

## Additive contract requests

These are requested before W2 implements the production renderer. They do not move planner logic into the frontend.

### 1. Envelope version

Add an explicit response contract version, for example:

```ts
contractVersion: 1
```

W2 needs a deterministic unsupported-version fallback instead of guessing from optional fields.

### 2. Canonical navigation descriptor

Keep arbitrary URLs out of model output. Prefer a closed route descriptor that W2 resolves through an internal registry:

```ts
type NavigationTarget = {
  module: 'customers' | 'contracts' | 'renewals' | 'opportunities' | 'calendar' | 'billing'
  entityType?: CanonicalEntityType
  entityId?: string
  view?: string
}
```

Final module/entity unions depend on W1. Every destination reauthorizes server-side.

### 3. Entity taxonomy

`entityType: string` is too open for exhaustive rendering. Publish a W1-aligned union or a registry/version that lets W2:

- select a safe icon/label;
- resolve the correct route;
- reject unsupported entity types visibly;
- avoid hard-coded inmobiliario assumptions.

### 4. Confirmation lifecycle

Clarify the frontend-safe interaction contract for confirm and cancel:

- stable `actionId` or equivalent opaque server reference;
- preview creation endpoint/result;
- confirm/cancel request shape;
- pending, expired, altered, replayed and completed states;
- whether a fresh `AssistantResponse` replaces or appends to the original card.

The browser must never construct or validate confirmation proofs. `argumentsDigest` is display/debug correlation only unless W3 specifies otherwise.

### 5. Follow-up semantics

Current `kind: 'action'` can be confused with an authorized mutation. Either:

- reserve follow-ups for message suggestions/refinements; or
- add a stable distinction between “send this prompt” and “open an action preview”.

A `label` plus free-form `prompt` must not become an implicit write control.

### 6. Safe error detail

Add a bounded structured error/notice block when the UI needs more than `status`:

```ts
type AssistantNotice = {
  code: string
  retryable: boolean
  title?: string
  detail?: string
}
```

Codes and copy must already be safe for the user; provider errors, SQL and internal policy detail remain server-side.

### 7. Table identity and continuation

For result tables that exceed the first payload, clarify:

- stable row identity or entity reference;
- total/continuation semantics when `truncated=true`;
- whether sorting/filtering is server-driven;
- how per-row navigation is represented without guessing IDs from arbitrary cells.

The runtime validator should validate every column descriptor, allowed `format`, row shape and bounded structured value before W2 receives it.

### 8. Streaming transport

Define whether partial streaming is outside `AssistantResponse` or represented by a separate event envelope. W2 needs deterministic states for:

- starting;
- receiving safe answer text;
- receiving final structured blocks;
- cancelled;
- failed;
- completed.

Structured action/confirmation blocks should become interactive only after final validation.

## W2 security and UX invariants

- Never render arbitrary HTML from `answer`.
- Never navigate to a model-supplied absolute URL.
- Never infer permissions from hidden/visible controls.
- Never convert a follow-up prompt into a mutation automatically.
- Never mark a proposed action as completed before the server result.
- Never expose raw request payloads, internal IDs, tokens, prompts or provider errors.
- Preserve keyboard focus when streaming completes or a card updates.
- Announce confirmation/result status without moving focus unexpectedly.
- Provide a responsive non-table representation when structured results cannot fit at 320 px.

## W2 implementation slices after canonical app bootstrap

1. Pure renderer for `answer`, statuses and safe notices.
2. Entity and navigation registry backed by W1 taxonomy.
3. Responsive table with explicit truncation/continuation state.
4. Follow-up prompt controls.
5. Confirmation card and server lifecycle integration.
6. Streaming state controller and accessibility tests.
7. Contract fixtures covering every status/block combination and unsupported-version fallback.

## Requested response from W3

Please update `W3_STATUS.md` with:

- the exact `AssistantResponse` subset W3 considers stable now for READ UI;
- accepted/deferred items above;
- the target `AssistantResponse` contract version;
- confirmation endpoint/lifecycle owner;
- streaming transport decision;
- the W1 entity taxonomy dependency.

W2's read-only slice and synthetic fixture manifest are now published in `W2_ASSISTANT_READ_UI_SLICE.md` and `fixtures/W2_ASSISTANT_READ_UI_FIXTURES.json`. W3 may validate these fixtures without enabling any write/confirmation UI.
