# W2 product experience acceptance contract

- Owner: W2
- Date: 2026-09-25
- Applies to: canonical CRM Telecom frontend
- Depends on: W1 data contracts, W3 assistant response contract and W4 release gates

## 1. Product outcome

A commercial user must understand the next useful action without learning the CRM's internal model. The primary authenticated experience answers, in this order:

1. What requires attention today?
2. Who should I contact and why?
3. Which permanence or renewal date is approaching?
4. Which opportunity is stalled or needs follow-up?
5. What changed recently for this customer?

The UI must not derive business urgency from invented frontend rules. Priority, risk and date semantics come from versioned W1 contracts or are shown as neutral facts.

## 2. Global shell

| Area | Acceptance criteria |
| --- | --- |
| Navigation | Uses telecom nouns; active route is programmatically exposed; keyboard order follows visual order |
| Global search | Opens quickly, retains the query and groups source-backed results by entity type |
| Page header | One clear title, optional context, one primary action and secondary actions without competing emphasis |
| Assistant entry | Available from relevant product context and carries the current route/entity reference, never raw page data |
| Mobile shell | Primary action remains reachable; drawer closes with Escape, traps/restores focus and exposes an accessible name |
| Feedback | Loading, success and failure are attached to the action that caused them; toasts do not contain required recovery instructions alone |

## 3. Dashboard command center

The dashboard is an operational queue, not a decorative analytics page.

| User question | UI outcome | Required W1 source | Empty behavior |
| --- | --- | --- | --- |
| What do I have today? | Ordered tasks and meetings with time, customer and next action | task/meeting read model | Explains that today is clear and offers a useful creation/navigation action |
| Who should I call? | Customer/contact rows with reason and due context | follow-up or task reason | Never invents a call list from stale generic clients |
| What renews soon? | Renewal/permanence items with date, remaining time and contract link | contract renewal/permanence dates and status | States that no upcoming items match the current window |
| What opportunity needs attention? | Opportunity, owner, stage and next follow-up | opportunity read model | Links to the full opportunities view |
| What changed? | Concise recent activity with entity deep links | activity feed | Distinguishes no activity yet from a filtered empty result |

Dashboard acceptance:

- every KPI exposes a stable definition and source;
- time-sensitive lists state the time window;
- completing an item has a pending state, prevents duplicate submission and reports rollback on failure;
- cards are links only when the full card has one destination;
- desktop supports scanning without horizontal page scroll;
- mobile orders today's work before aggregate metrics.

## 4. Customer 360

The first viewport identifies the company and the next operational risk. Sections load independently so a documents or activity failure does not hide identity and contracts.

Recommended information order once W1 contracts exist:

1. Company identity: legal name, CIF, commercial name, status and owner.
2. Primary contacts and preferred contact paths.
3. Operational summary: services, lines, operators and open incidents.
4. Contract timeline: start, permanence end, renewal window and status.
5. Opportunities and next actions.
6. Tasks and meetings.
7. Documents, notes and activity.

Customer 360 acceptance:

- unknown data displays as unknown/not provided, never as a false zero;
- dates use one locale/time-zone policy and retain machine-readable values;
- service and line counts link to the filtered underlying list;
- destructive or sensitive actions require the server-side permission/confirmation contract;
- long company names, CIFs and contact details wrap or truncate with accessible full context;
- each section defines loading, error, empty and populated states.

## 5. Assistant as product interface

W2 renders W3's versioned discriminated union exhaustively. The frontend must not infer tool choice, permissions, risk or business semantics from assistant prose.

Acceptance by response type:

| Type | Required presentation |
| --- | --- |
| Text | Readable prose with safe links and preserved conversation context |
| Entity reference | Entity label, type, relevant status and canonical deep link |
| Table | Named columns, responsive alternative and clear row destinations/actions |
| Card | Compact source-backed summary; no fabricated missing fields |
| Proposed action | Target, effect, canonical arguments, permission/risk cue and explicit confirmation affordance |
| Execution result | Stable success/failure state, affected entity link and recovery action where available |
| Recoverable error | Plain-language cause category and one safe retry/next step |

Assistant acceptance:

- page context is visible and removable before sending;
- proposed actions are visually distinct from completed actions;
- a disabled action explains the permission or missing prerequisite;
- streamed content does not move focus unexpectedly;
- structured results remain usable at 320 px and with keyboard-only navigation;
- raw JSON, internal IDs, prompts, tokens and provider errors never become normal product UI.

## 6. Billing UX

The historical Facturación PRO module is a read-only reference until the canonical model exists. Preserve valuable behavior only when it matches W1:

- invoice lifecycle and status clarity;
- line items and monetary summaries;
- numbering/configuration boundaries;
- PDF preview/download states;
- trash/restore behavior and confirmation;
- error recovery that retains draft input.

No UI copy claims fiscal compliance without a dedicated legal/fiscal review.

## 7. State taxonomy

| State | Product meaning | Required behavior |
| --- | --- | --- |
| Initial loading | No usable response yet | Stable skeleton matching the destination layout; screen-reader loading status; reduced-motion support |
| Refreshing | Existing data remains usable | Keep content visible; attach progress to refresh/action control |
| First-use empty | User has not created data | Explain value and offer one primary start action |
| No-data-yet | System has no source records | Explain what will appear and when |
| Filtered empty | Data exists but filters exclude it | Name active filters and offer clear/reset |
| Partial error | One section failed | Preserve unaffected content and allow scoped retry |
| Route error | Page cannot render safely | Plain-language fallback, retry and safe navigation destination |
| Mutation pending | An action is being saved | Prevent duplicates and preserve context |
| Mutation failure | Save did not complete | Restore optimistic state and keep user input where safe |

## 8. Responsive acceptance matrix

| Width | Required review |
| ---: | --- |
| 320 px | No page-level horizontal overflow; primary action and critical status remain visible |
| 375 px | Forms, cards and assistant results fit without clipped controls |
| 768 px | Tablet navigation and two-column layouts maintain logical reading order |
| 1024 px | Desktop shell does not crowd tables or calendar actions |
| 1440 px | Content width/density supports scanning without excessive empty space |

Tables must provide one of: responsive column prioritization, a deliberate horizontal region with label, or a card/list alternative. Hiding a critical status/action solely by viewport is not acceptable.

## 9. Accessibility acceptance

- One logical `h1` per page and ordered section headings.
- Every form field has a programmatic label, error association and invalid state.
- All icon-only controls have an accessible name.
- Dialogs trap focus, close intentionally and restore focus to the opener.
- Interactive elements meet keyboard operation and visible-focus requirements.
- Status updates use the least disruptive appropriate live-region behavior.
- Color is not the only carrier of urgency, status or validation.
- Animations respect `prefers-reduced-motion`.
- Automated checks complement, but do not replace, keyboard and screen-reader review.

## 10. Evidence required in W2 pull requests

- routes and states exercised;
- executed lint, typecheck, tests and production build;
- screenshots or recordings at the affected responsive widths once preview is available;
- keyboard/accessibility notes for new controls;
- loading, empty, error and populated evidence;
- contract/version consumed from W1 or W3;
- explicit statement when no auth, tenant, logging or assistant-control boundary changed.
