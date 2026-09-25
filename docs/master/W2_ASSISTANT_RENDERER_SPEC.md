# W2 assistant structured renderer specification

- Owner: W2
- Date: 2026-09-25
- W3 source reviewed: `w3/assistant-runtime-foundation` at `9ef926b`
- Contract: `src/assistant/ui-contract.ts`
- Status: consumption design ready; confirmation and production integration remain gated

## 1. Ownership boundary

W3 owns planning, capability selection, validation, authorization inputs, confirmation issuance, idempotency and the final structured response. W1 owns entity/data contracts and server-side tenant authorization. W2 owns only:

- validating the transport response with the W3-published validator;
- adapting a valid response into presentational view models;
- rendering text and structured blocks accessibly;
- resolving closed navigation descriptors through product routes;
- sending explicit user interactions through documented W3 endpoints;
- preserving safe loading, partial, error and focus behavior.

W2 never parses prose to infer entities/actions, executes a capability directly, trusts browser workspace IDs or treats control visibility as authorization.

## 2. Current v1 capability matrix

| Contract surface | Current state | W2 consumption decision |
| --- | --- | --- |
| `answer`, `status`, `grounded`, `meta` | Present and bounded | Ready for pure presentation adapter |
| `blocks.entities` | Present; `entityType` is open string | Render generic safe references; deep links wait for W1 taxonomy |
| `blocks.table` | Present with transport bounds | Render only after stricter descriptor/row validation or adapter sanitization |
| `blocks.followUps` | Present; `kind: action` ambiguous | Suggestions/refinements may send a prompt; `action` never mutates directly |
| `blocks.navigation` | Open module/entity strings | Do not navigate until W3/W1 publish a closed descriptor registry |
| `blocks.confirmation` | Preview fields but no opaque action lifecycle | Information-only in prototypes; production confirm control blocked by W4 P0 |
| Streaming | Not defined | Treat response atomically; structured controls appear only after final validation |
| Contract version | Not defined | Production integration waits for explicit version/fallback semantics |

W3's structured-plan validator at `9ef926b` strengthens the runtime but does not change this UI response contract.

## 3. Transport boundary

The client receives `unknown`, never trusts a TypeScript assertion from network data, and calls W3's `validateAssistantResponse` before feature adaptation.

```text
HTTP result
  -> W3 runtime validator
    -> supported-version check
      -> W2 presentation adapter
        -> block renderers
```

If validation or version support fails:

- show a generic recoverable assistant failure;
- retain the user's message and conversation context;
- expose a safe retry;
- correlate support with `requestId` only when the envelope was safely validated;
- never partially render unvalidated blocks or raw JSON.

The browser does not log the original response payload.

## 4. Presentation order

For one final response, visual and DOM order is:

1. status/partial notice when required;
2. primary answer text;
3. supporting entities or table;
4. proposed confirmation card;
5. safe navigation affordance;
6. follow-up prompts/refinements.

Blocks support the answer; they do not compete as separate chatbot messages. `meta` is operational metadata and is not normal user copy.

When `grounded=false`, entity/table blocks are not presented as verified evidence. Until W3 defines degraded semantics, W2 omits those blocks and shows answer text with a neutral limitation notice.

## 5. Status presentation

| W3 status | UI pattern | Allowed interaction |
| --- | --- | --- |
| `SUCCESS` | Answer and validated blocks | Navigate or send follow-up |
| `EMPTY` | Neutral no-results explanation | Refine or open relevant module |
| `PARTIAL` | Persistent partial notice plus valid content | Retry/refine without discarding content |
| `AMBIGUOUS` | Clarification choices | Send selected refinement only |
| `NOT_FOUND` | Requested result unavailable | Search/refine |
| `FORBIDDEN` | Permission-safe denial | Safe navigation/admin guidance if supplied |
| `CONFIRMATION_REQUIRED` | Proposed-action preview | Confirm/cancel only after W4-approved lifecycle exists |
| `INVALID_CONFIRMATION` | Expired/changed preview | Request fresh preview |
| `INVALID_INPUT` | Recoverable request problem | Edit/refine |
| `CONFLICT` | Canonical state changed | Refresh evidence and request a new action preview |
| `POLICY_BLOCK` | Policy boundary | Offer only a server-supplied safe alternative |
| `UNAVAILABLE` | Temporary dependency failure | Retry with backoff guidance |
| `INTERNAL_ERROR` | Generic failure with safe reference | Retry/support path |

Status is announced once with the least disruptive live region. Passive arrival never steals focus.

## 6. Block renderers

### Answer

- Render plain text or a deliberately restricted Markdown subset.
- Never render arbitrary HTML, scripts, embedded media, data URLs or model-supplied component syntax.
- External links require an explicit future allowlist policy; internal entity navigation uses descriptors only.
- Preserve readable paragraphs/lists without treating prose as executable UI.

### Entity references

- Generic fallback shows `label` and optional `subtitle` as text.
- Icon, localized entity name and destination come from a W1-aligned entity registry, never from `entityType` string concatenation.
- IDs are opaque navigation references and are not displayed by default.
- Unknown entity types remain non-interactive and visibly unsupported rather than guessing a route.
- Every destination reauthorizes the entity server-side.

### Table

- Column order and labels come from validated descriptors.
- Formats map through a closed renderer registry: text, number, currency, date, datetime and status.
- Currency requires currency semantics in the contract; a numeric value alone is not formatted as money.
- Unknown/invalid formats degrade to safe text only after structured-value validation.
- Critical row identity/navigation must be explicit; W2 never guesses an entity ID from an arbitrary cell.
- `truncated=true` displays an explicit incomplete-results notice and continuation action only when W3 supplies continuation semantics.
- Desktop uses a table for meaningful comparison. Compact layouts use prioritized labelled rows/cards or a named horizontal scroll region.
- Transport ceilings (20 columns/100 rows) are not display targets; W2 may show a smaller deliberate preview.

### Follow-ups

- `suggestion` and `refine` send the visible server-supplied prompt after normal input validation.
- The control text and resulting prompt are inspectable; activation never bypasses the conversation request path.
- `action` is rendered as a request for a preview, not as an authorized mutation.
- Maximum visible choices may be lower than W3's six-item transport bound; remaining choices require explicit expansion.

### Navigation

- W2 resolves a closed `{ module, entityType?, entityId?, view? }` descriptor through an internal route registry.
- No absolute/relative URL supplied by the model is accepted.
- Unsupported descriptors render no link and emit only safe development telemetry.
- Query parameters are assembled from typed route builders, not string concatenation.

### Confirmation

The current `ConfirmationCard` has `capability`, `argumentsDigest`, title, summary, risk and expiry. It lacks a server-issued opaque `actionId` and lifecycle contract.

Production rules:

- no enabled confirm button until W3 closes the W4 confirmation/idempotency P0s;
- the browser never reconstructs canonical arguments or treats `argumentsDigest` as proof;
- the preview names target, effect, risk and expiry in user language;
- irreversible and sensitive writes have distinct, non-color-only treatment;
- confirm/cancel use an opaque server reference and remain pending until a terminal server response;
- expired, replayed, altered, forbidden, conflict and failed results are distinct;
- success links to the affected entity and is never inferred from HTTP transport alone.

## 7. Interaction state machine

```text
idle
  -> sending
    -> validated(response)
    -> invalid-response(retry)
    -> request-error(retry)

validated(CONFIRMATION_REQUIRED)
  -> preview
    -> confirming
      -> completed
      -> conflict(refresh preview)
      -> expired(refresh preview)
      -> forbidden
      -> failed(retry when server marks safe)
    -> cancelled
```

- Sending disables only the relevant composer/action, not navigation or prior history.
- Duplicate confirm/cancel activation is blocked locally but server idempotency remains mandatory.
- Cancelling a network request does not imply cancelling a server action.
- A replacement card preserves focus by stable opaque action identity.

## 8. Contextual integration

Feature pages may attach only a bounded reference envelope:

```ts
type AssistantPageContext = {
  module: 'dashboard' | 'customers' | 'contracts' | 'opportunities' | 'calendar' | 'billing'
  entityType?: string
  entityId?: string
  visibleSection?: string
}
```

The final closed unions depend on W1. Page context is visible and removable before sending. It contains references, not copied DOM data, customer contact details, document content or hidden form state. W3/W1 re-read and reauthorize referenced data server-side.

## 9. Responsive and accessibility behavior

- At 320 px, answer, evidence and actions use one reading column without page overflow.
- Structured tables retain critical identity/status/action and expose an accessible full-detail path.
- Response region has a programmatic label; messages maintain chronological DOM order.
- New responses use polite status announcements without moving focus.
- Suggested prompts are buttons with distinguishable names, not clickable chips without semantics.
- Confirmation risk and lifecycle never rely on color alone.
- Pending controls retain accessible names and expose progress.
- Focus returns to the initiating control after cancel; terminal replacement moves focus only when required for recovery.
- Streaming, when later defined, does not announce token-by-token text or enable structured controls before final validation.

## 10. Error and telemetry boundary

User-visible errors come from a bounded safe-code mapping. Provider messages, SQL, stack traces, model prompts, arguments, tokens and raw payloads never render or enter client logs.

Allowed telemetry is limited to safe operational facts such as:

- response contract version;
- supported/unsupported block kind;
- W3-safe status code;
- request correlation ID;
- timing and retry outcome without message/answer content.

W4's output-schema finding is a release gate. W2's adapter is defense in depth, not a substitute for closed capability output schemas and source redaction.

## 11. Contract fixtures and tests

W2 will request or create non-customer fixtures for:

- every `ResultStatus`;
- grounded/ungrounded and partial combinations;
- answer only, entities only, table only and mixed blocks;
- unknown entity/module/format and unsupported contract version;
- table bounds, missing row cells, extra row keys and invalid structured values;
- truncated table with and without continuation;
- follow-up suggestion/refine/action semantics;
- confirmation safe/sensitive/irreversible and every lifecycle result;
- invalid response containing secret-like keys or unsafe navigation;
- long Spanish labels at 320 px;
- keyboard and screen-reader interaction;
- request cancellation, retry and duplicate activation.

Contract tests must prove exhaustive status/block handling. Component tests prove semantics/focus. Integration tests prove typed route resolution and confirm/cancel transport only after W3/W4 gates pass.

## 12. Remaining W3/W1 gates

Before production source integration, W2 needs:

- explicit response `contractVersion`;
- closed navigation and entity taxonomy aligned with W1;
- fully validated exact block shapes and closed capability output schemas;
- table row identity, currency and continuation semantics;
- follow-up mutation distinction;
- bounded safe notice/error detail;
- server-issued one-time confirmation reference and endpoint lifecycle;
- atomic idempotency behavior accepted by W4;
- streaming event envelope or explicit decision to remain atomic.

These requirements are also tracked in `docs/master/agents/W2_HANDOFF_W3_ASSISTANT_UI.md`.
