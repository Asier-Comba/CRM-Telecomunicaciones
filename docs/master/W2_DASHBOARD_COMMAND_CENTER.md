# W2 dashboard command center specification

- Owner: W2
- Date: 2026-09-25
- Status: UX and presentation contract ready; implementation waits for W1 dashboard read models
- Scope: default authenticated landing experience for commercial and operational users

## 1. Product job

The dashboard is a prioritized work surface. Within one scan it must answer:

1. What requires my attention today?
2. Which customer should I contact next, and why?
3. Which permanence or renewal date is approaching?
4. Which opportunity needs follow-up?
5. What changed since I last worked here?

It is not an analytics showcase. A metric without a definition, action or reliable source does not belong in the first release.

## 2. Information order

### Primary flow

1. Page identity, date/workspace context and one primary quick action.
2. Attention summary: overdue/today items and source-backed alerts.
3. Today's tasks and meetings in chronological/actionable order.
4. Renewal and permanence queue.
5. Opportunity follow-up queue.
6. Recent customer activity.

### Secondary context

- compact stable totals only when W1 provides definitions and comparison semantics;
- relevant customers derived from explicit W1 criteria, not frontend heuristics;
- assistant entry using a bounded dashboard page-context descriptor;
- navigation to full filtered views.

On compact screens, work queues precede aggregate totals. No KPI strip may push today's first action below decorative content.

## 3. Stable feature boundaries

| Boundary | Responsibility | Does not own |
| --- | --- | --- |
| `DashboardHeader` | Greeting/context, date scope, primary quick action | Auth/workspace resolution |
| `AttentionSummary` | Bounded ordered attention items | Calculating business severity |
| `TodayAgenda` | Tasks and meetings for the declared day/window | Calendar synchronization |
| `RenewalQueue` | Upcoming renewal/permanence facts and destinations | Deriving undocumented risk |
| `OpportunityQueue` | Follow-ups with stage, owner and next action | Pipeline rules or scoring |
| `RecentActivity` | Safe summaries and canonical entity links | Rendering raw audit payloads |
| `MetricSummary` | W1-defined totals with source/time scope | Local aggregation over partial page data |
| `DashboardAssistantEntry` | Bounded page context and suggested prompts | Planner/tool choice or authorization |

The route composes these sections. Each section consumes a typed presentation projection and can fail/retry independently.

## 4. Required W1 presentation contracts

Names describe semantic needs, not database fields or endpoint shapes.

### Dashboard envelope

| Need | Required semantics |
| --- | --- |
| `generatedAt`/freshness | Time zone and meaning of freshness |
| viewer context | User/team scope and whether queues are personal or shared |
| date window | Inclusive/exclusive bounds and workspace time zone |
| partial result | Which sections succeeded/failed and safe retry identity |
| permissions | Capabilities per exposed action; hiding controls is not authorization |

W1 may publish one bounded dashboard read model or independent section queries. W2 prefers independent cache/error ownership when latency and authorization allow it.

### Attention item

Minimum needs:

- stable item ID and canonical entity reference;
- source kind: task, meeting, renewal, permanence, opportunity or operational alert;
- safe label and supporting reason;
- canonical priority/severity when available;
- due/event timestamp plus time-zone semantics;
- owner/assignee when relevant;
- allowed primary action and canonical destination descriptor;
- updated/freshness marker.

W2 will not assign “critical,” “at risk,” “overdue” or “stalled” from undocumented client-side thresholds.

### Task and meeting item

- stable ID, type, title, customer reference;
- start/due time, duration when known and all-day flag;
- state, assignee and completion capability;
- location/channel only when safe and useful;
- canonical destination and optional join/contact action;
- reschedule/completion mutation version or conflict semantics.

### Renewal/permanence item

- stable contract/customer references;
- display-safe contract/service label;
- event kind and canonical state;
- relevant date/window and workspace time zone;
- remaining-time value only if W1 defines the calculation source;
- owner and next recorded action when available;
- canonical customer/contract destinations.

### Opportunity follow-up

- stable opportunity/customer references;
- display title, canonical stage and owner;
- next follow-up timestamp/state;
- amount/currency only when permitted and semantically comparable;
- canonical attention reason from W1 or neutral date fact;
- destination and allowed follow-up action.

### Activity item

- stable activity ID;
- safe pre-redacted summary and canonical kind;
- actor label where permitted;
- timestamp/time zone;
- zero or more canonical entity references;
- pagination cursor or bounded-result policy.

Raw metadata, internal IDs, prompts, tokens and audit/security payloads never enter the presentation contract.

## 5. Prioritization and ordering

W1 owns business priority. W2 owns only deterministic presentation ordering over explicit fields:

1. canonical severity/priority order supplied by W1;
2. due/event timestamp;
3. stable ID as final deterministic tie-breaker.

If W1 does not provide canonical priority, W2 groups by neutral time facts (overdue/today/upcoming) only after W1 defines the date and overdue semantics. The frontend does not infer customer risk from contract value, inactivity or missing data.

The UI always names the queue window, for example “Hoy” or “Próximos 30 días,” using the workspace time zone.

## 6. Section state behavior

| State | Dashboard behavior |
| --- | --- |
| Initial loading | Preserve stable section geometry; prioritize header and first work queue |
| Ready | Show declared scope/window and source-backed actions |
| Refreshing | Keep known content visible and attach progress to the section/refresh control |
| Empty | Explain that this queue is clear; offer a useful destination/create action when allowed |
| Filtered empty | Name current team/date/filter scope and expose reset/change |
| Partial error | Keep all other sections usable; label failed section and scope retry |
| Stale with error | Keep timestamped known data, mark it stale and offer retry without implying freshness |
| Mutation pending | Keep item position, block duplicate submission and show local progress |
| Mutation conflict/failure | Restore or refresh canonical state; retain context and explain safe next step |

The full route fails only when shell/viewer context cannot be established safely. One widget failure never becomes a blank dashboard.

## 7. Actions

### Quick action

The header exposes one primary creation action chosen from configured pilot capability, with secondary actions in a labelled menu. The UI must not guess access from role labels; W1 supplies action capabilities.

### Inline completion

Task completion is allowed only when W1 defines:

- permission/capability;
- idempotency or duplicate-submission behavior;
- optimistic concurrency/conflict response;
- cache invalidation/read-after-write expectation;
- safe success and error codes.

W2 may use optimistic presentation only with rollback and a stable item version. Otherwise it uses an explicit pending state and refreshes from source.

### Assistant entry

Dashboard context is a bounded reference, not a copy of loaded data:

```ts
type DashboardPageContext = {
  module: 'dashboard'
  visibleSection?: 'attention' | 'today' | 'renewals' | 'opportunities' | 'activity'
}
```

W3/W1 resolve and authorize current data server-side. Suggested prompts are presentation hints, never hidden capability invocations.

## 8. Responsive composition

### Compact

- header and primary action remain visible without horizontal scroll;
- attention and today queue appear before metrics;
- each row exposes customer, reason/date and one primary action;
- secondary metadata moves into a labelled disclosure or detail destination;
- assistant context entry is available but does not cover core navigation.

### Intermediate

- attention and today may form a balanced two-column area when reading order remains correct;
- renewal and opportunity queues may share a row but retain independent headings/states;
- no equal-height requirement causes excessive empty space.

### Wide

- main work queue plus bounded secondary rail is allowed;
- critical attention cannot exist only in the rail;
- sections use readable line length and useful table density rather than stretching to viewport width.

## 9. Accessibility

- One page `h1`; each queue has a programmatic heading and optional labelled count.
- Time and status are expressed in text, not color alone.
- Items use lists when they are homogeneous queues; tables only for meaningful column comparison.
- Completing/removing an item announces the result without moving focus to the top of the page.
- A refreshed queue retains focus unless the focused item no longer exists, then moves to a documented nearby target.
- Skeletons are not repeated as noisy accessible content.
- Auto-refresh never interrupts reading or resets keyboard position.
- Links and actions include enough entity context to make repeated labels distinguishable.

## 10. Metrics admission gate

A metric may be added only when all are documented:

1. product question it answers;
2. exact W1 definition and source;
3. viewer/workspace scope;
4. time window and time zone;
5. null/partial-data treatment;
6. destination or action;
7. refresh/freshness behavior.

Until then, the dashboard ships useful source rows rather than placeholder percentages, trends or vanity counts.

## 11. Test scenarios

- user with overdue work, today's meeting and upcoming renewal;
- user with a completely clear day;
- shared/team scope versus personal scope;
- renewal section fails while agenda remains usable;
- stale data after refresh failure;
- task completion success, duplicate click, permission loss and version conflict;
- long customer names and multiple time zones near day boundary;
- 320 px layout with all attention kinds;
- keyboard-only completion, section retry and filtered navigation;
- reduced motion and screen-reader status updates;
- unknown status/priority values use neutral safe fallback;
- no metrics returned: no empty decorative KPI placeholders.

## 12. Implementation sequence

1. Map W1 envelope/section projections into feature-owned view models.
2. Implement route shell plus independent section boundaries.
3. Ship attention and today queues first, with fixture-backed component tests.
4. Add renewal/permanence and opportunity queues.
5. Add activity and admitted metrics only after their contracts pass the gate.
6. Add assistant context entry after W3 navigation/context versioning.
7. Validate all responsive, partial-failure and mutation scenarios before merging.
