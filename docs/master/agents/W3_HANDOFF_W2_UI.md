# W3 → W2 handoff — Assistant UI contract

Status: stable foundation contract; telecom taxonomy remains blocked on W1.
Contract: `AssistantResponse` version `1` in `src/assistant/ui-contract.ts`.

## Safe to consume now

W2 can render these validated structures without parsing Markdown:

- `answer`, `status`, `grounded` and bounded `meta`;
- tables with closed columns, scalar cells, explicit ISO currency codes, optional unique `rowIdentity` and required continuation metadata when truncated;
- non-executing follow-ups (`suggestion` or `refine` only);
- safe notices with stable code and retryability;
- confirmation cards containing an opaque `confirmationId`, expiry, risk and exactly `confirm`/`cancel` actions;
- separate streaming events: `started`, bounded `answer_delta`, `final`, `cancelled`, `failed`.

Structured blocks become interactive only from the validated `final` event. Delta events contain text only.

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
