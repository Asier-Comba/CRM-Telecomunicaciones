# W2 assistant slice A — READ UI

- Owner: W2
- Date: 2026-09-25
- W3 source reviewed: `w3/assistant-runtime-foundation` at `874259e`
- W4 gate: Issue `#10` remains open; all mutation/confirmation UI is excluded
- Status: stable READ v1 subset reconciled; renderer/stream fixtures ready

## 1. Scope split

### Included now — READ UI

- answer summaries;
- safe notices/statuses;
- entity references validated against an injected closed taxonomy;
- structured tables;
- card/list presentation derived from entity/table blocks;
- closed navigation descriptors once W3/W1 publish them;
- suggestion/refinement follow-ups;
- partial results;
- atomic loading, cancellation and retry;
- text-only streaming with controls activated only from a validated final event.

### Excluded — release-gated mutation UI

- enabled confirm/cancel controls for writes;
- mutation previews treated as executable;
- any client-generated confirmation proof;
- optimistic assistant writes;
- action follow-ups that directly invoke a capability.

W4 Issue `#10` must be closed with accepted confirmation/idempotency/output-schema evidence before mutation UI begins.

## 2. Stable READ v1 subset

W3 `874259e` explicitly marks the READ subset stable and executes the nine W2 compatibility decisions in its own test suite:

| Surface | READ UI decision |
| --- | --- |
| `answer` | Render as safe text/restricted Markdown summary |
| `status` | Map to notice/empty/partial/error presentation |
| `grounded` | Gate evidence-like entity/table presentation |
| `blocks.entities` | Render only after W3 validates them against the injected taxonomy; unknown entity types reject the envelope |
| `blocks.table` | Responsive table/card preview after strict validation |
| `blocks.followUps` | Enable only validated `suggestion` and `refine`; any executable kind rejects the envelope |
| `blocks.navigation` | Disabled until closed descriptor registry exists |
| `meta.requestId` | Safe correlation only; never primary user content |
| `meta.partial` | Persistent partial-result notice |
| `blocks.confirmation` | Shape is transport-stable but not rendered as executable UI while Issue `#10` is open |

The renderer receives either a fully validated response or a safe transport/error state. It never repairs, hides selected invalid fields or downgrades an invalid W3 envelope locally.

## 3. Component tree

```text
AssistantReadResponse
├── AssistantResponseBoundary
│   ├── ResponseLoading
│   ├── InvalidResponseNotice
│   └── RequestErrorNotice
├── AssistantStatusNotice
├── AssistantAnswer
├── AssistantEvidence
│   ├── EntityReferenceList
│   │   └── EntityReferenceCard
│   └── StructuredResultView
│       ├── ResultTable
│       └── ResultCardList
├── AssistantNavigationAction
└── FollowUpSuggestions
```

`AssistantResponseBoundary` receives `unknown`, calls W3's validator and only then builds W2 view models. Block components never parse prose or execute capabilities.

## 4. Read contract requirements

| ID | `CONTRACT_REQUIREMENT` | Needed from W3/W1 |
| --- | --- | --- |
| W3-READ-01 | Envelope version | Closed: `contractVersion: 1`; unknown versions reject |
| W3-READ-02 | Stable subset | Closed at `874259e` for envelope, READ statuses, notice/table/follow-ups and text streaming |
| W3-READ-03 | Exact validation | Closed in W3 validator; W2 consumes validated output only |
| W3-READ-04 | Entity taxonomy | W1-aligned closed entity types or versioned registry |
| W3-READ-05 | Navigation descriptor | Closed modules/entities/views with no arbitrary URL |
| W3-READ-06 | Table identity | Closed: optional declared unique identity, explicit currency and mandatory continuation when truncated |
| W3-READ-07 | Safe notice | Closed bounded code/retryability/title/detail |
| W3-READ-08 | Follow-up semantics | Closed: prompt-only `suggestion`/`refine`; executable kinds reject |
| W3-READ-09 | Page context | Closed bounded reference envelope; server re-read/reauthorization |
| W3-READ-10 | Streaming | Closed: started, text-only delta, validated final, cancelled and failed notice |

## 5. Rendering rules

### Summary/answer

- Plain text or restricted Markdown only.
- No arbitrary HTML, embedded media, data URLs, scripts or component syntax.
- Links are disabled unless they are W2-resolved closed descriptors.
- Long content uses readable measure and preserves semantic paragraphs/lists.

### Safe notices

| Condition | Notice behavior |
| --- | --- |
| `EMPTY` | Neutral no-results state with refine suggestion when supplied |
| `PARTIAL` or `meta.partial` | Persistent visible limitation; keep validated content |
| `AMBIGUOUS` | Clarification prompt/choices; no inferred entity selection |
| `NOT_FOUND` | Safe missing-result copy and refine/search option |
| `FORBIDDEN` | Permission-safe denial without resource existence detail |
| `INVALID_INPUT` | Recoverable edit/refine guidance |
| `POLICY_BLOCK` | Policy boundary and only server-supplied safe alternative |
| `UNAVAILABLE` | Temporary failure and retry when allowed |
| `INTERNAL_ERROR` | Generic error plus safe request correlation |

Confirmation-specific statuses are not actionable in READ slice A.

### Entity references/cards

- Display validated label/subtitle.
- Treat ID as opaque and do not show it normally.
- Use a neutral icon/type label until W1 taxonomy exists.
- Unknown entity type rejects the transport envelope against the injected taxonomy; it never reaches a fallback card.
- Once W3-READ-04/05 close, route through the W2 registry and reauthorize at destination.
- Cards are a W2 visual treatment of `EntityReference`; no new transport card schema is assumed.

### Tables/card lists

- Validate descriptor, column count, format, row shape and structured values before display.
- Use table only for meaningful comparison.
- At compact width, prioritize labelled facts or use a named horizontal scroll region.
- Never guess row identity/destination from an arbitrary cell.
- Currency requires explicit currency semantics; numbers are otherwise numbers/text.
- `truncated=true` shows incomplete-results notice; continuation requires W3-READ-06.
- Unknown formats reject at validation; W2 never receives raw object JSON to degrade locally.

### Navigation

- No model-supplied URL is accepted.
- Unsupported descriptor renders no link and safe telemetry only.
- W2 typed route builders own path/query construction.
- Destination server loaders reauthorize entity/workspace access.

### Follow-up suggestions

- Only `suggestion` and `refine` are enabled.
- Activation sends the visible prompt through the normal read request path.
- Any executable/action follow-up is invalid READ v1 input and rejects the envelope.
- A follow-up never silently changes data.

## 6. Loading and streaming contract

### Atomic implementation available first

```text
idle -> sending -> validating -> ready | empty | partial | error
              \-> cancelled
```

- Keep prior history readable while current request loads.
- Disable duplicate send for the active request only.
- Cancellation stops browser waiting; it does not claim server cancellation.
- Structured blocks appear only after final W3 validation.
- Retry retains the user's prompt/context reference safely.

### Stable streaming boundary

W3-READ-10 now distinguishes:

- start;
- safe answer-text delta;
- final structured response;
- cancelled;
- retryable failure;
- terminal failure;
- completed.

Token-by-token text is not announced to screen readers. Delta events contain text only. Entity/table/navigation controls activate only after the final structured envelope validates; interruption never promotes accumulated text into structured evidence.

## 7. Partial and ungrounded results

- `meta.partial=true` or `PARTIAL` always produces a visible limitation.
- Valid blocks remain usable; invalid blocks reject the response rather than render partially trusted data.
- When `grounded=false`, answer text may display with a neutral limitation only when the validated envelope has no entity/table evidence. Ungrounded evidence makes the source envelope invalid; W2 does not accept then hide it.
- A partial table does not show a total unless W3 provides a trustworthy total/continuation contract.

## 8. Responsive and accessibility

- Chronological response order remains DOM order.
- Response region has an accessible label and each response can be identified without visual bubbles alone.
- One polite completion/status announcement; passive response arrival does not steal focus.
- Entity cards and follow-up buttons have distinguishable accessible names.
- Tables expose headers/relationships; card alternative preserves the same labels.
- At 320 px, no page-level overflow and no clipped follow-up/navigation controls.
- Loading spinner is hidden from assistive technology while text exposes progress.
- Reduced motion disables non-essential typing/pulse/entry animation.
- Retry returns focus only when a user-triggered state change requires recovery guidance.

## 9. Security and telemetry

- Client receives `unknown`; validation happens before adaptation.
- No raw response/message/prompt/customer data enters browser logs.
- No HTML injection or arbitrary URL navigation.
- No workspace/user selector from model output is trusted.
- Safe telemetry may include supported contract version, W3-safe status, block kind, timing and request ID.
- W2 validation is defense in depth, not a substitute for W3 closed output schemas/source redaction.

## 10. Tests and fixtures

Fixture manifest: `docs/master/fixtures/W2_ASSISTANT_READ_UI_FIXTURES.json`.

### Contract tests

- Accept every valid READ status/block fixture.
- Reject missing envelope parts, unsupported version, secret-like keys and invalid row values.
- Prove unknown entity/navigation descriptors reject and cannot produce a URL.
- Prove mutation/confirmation blocks cannot enable a write control in slice A.
- Exhaustively map W3 READ statuses; unsupported statuses fail validation into the safe invalid-response boundary.

### Component tests

- Answer-only, empty, partial, forbidden, unavailable and invalid-response states.
- Registry-backed entity presentation plus invalid/unknown taxonomy rejection.
- Table desktop/card compact representation and truncated notice.
- Suggestion/refine send, executable-follow-up rejection and duplicate prevention.
- Keyboard order, accessible names, live status and reduced motion.

### Integration tests after accepted base

- Validated response transport to renderer.
- Page context is visible/removable and contains references only.
- Retry/cancel/timeout without losing history.
- Server reauthorization on every entity destination.
- 320, 375, 768, 1024 and 1440 px.

## 11. Definition of done

- W3 READ subset/version remains compatible with the executable W2/W3 fixture matrix.
- W3-READ-01 through 10 are closed or deliberately deferred with safe fallback.
- W4 accepts read-output validation/logging/PII behavior.
- Confirmation/mutation UI remains absent or non-actionable while Issue `#10` is open.
- Contract fixtures pass against W3's validator and W2 adapter.
- Component/integration tests and responsive/accessibility evidence pass on the accepted base.
