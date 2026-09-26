# W3 → W2 handoff — Assistant UI contract

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
