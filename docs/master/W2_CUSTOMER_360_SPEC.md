# W2 Customer 360 product specification

- Owner: W2
- Date: 2026-09-25
- Status: UI architecture ready; implementation blocked on W1 customer/contract read models
- Scope: company/customer detail experience for telecom commercial and operations users

## 1. Outcome

Customer 360 must let a user answer in seconds:

- who the company is and who owns the relationship;
- who to contact;
- which services, lines and operators are active;
- which contracts exist and when permanence/renewal dates matter;
- what commercial or operational work is pending;
- what changed recently;
- what the next safe action is.

It is not a database record viewer. The first viewport prioritizes identity, current attention and the next action; secondary evidence remains reachable without overwhelming the user.

## 2. Page architecture

```text
Customer 360
├── Identity header
│   ├── legal/commercial identity
│   ├── relationship owner and status
│   └── primary actions
├── Attention summary
│   ├── next task/meeting
│   ├── renewal/permanence alert
│   └── open operational issue
├── Overview
│   ├── primary contacts
│   ├── active services and lines
│   └── contract summary
├── Commercial work
│   ├── opportunities
│   └── tasks and meetings
├── Operations
│   ├── incidents
│   └── service/contract detail
└── Record
    ├── documents
    ├── notes
    └── activity timeline
```

The tree describes visual ownership, not one required API payload. Each major section may load independently and must not hide the identity header when another section fails.

## 3. Stable UI boundaries

| Boundary | Responsibility | Explicit non-responsibility |
| --- | --- | --- |
| `CustomerIdentityHeader` | Name, CIF, status, owner, primary safe actions | Deriving permissions or customer risk |
| `CustomerAttentionSummary` | Ordered source-backed items requiring attention | Calculating urgency from undocumented frontend rules |
| `ContactPanel` | Primary/secondary contacts and contact affordances | Sending communications without integration/confirmation contracts |
| `ServicePortfolio` | Services, lines, operators and statuses | Billing or contract calculations |
| `ContractTimeline` | Contract dates, permanence and renewal windows | Inventing renewal state from missing dates |
| `CommercialWorkPanel` | Opportunities, tasks and meetings | Re-implementing pipeline logic |
| `IncidentPanel` | Current incidents and operational state | Provider-side incident mutation without W1 contract |
| `CustomerDocuments` | Document metadata, preview/download/upload states | Trusting filenames/content or bypassing storage authorization |
| `CustomerActivityTimeline` | Ordered safe activity summaries and entity links | Rendering raw audit payloads or sensitive logs |

Routes compose these boundaries and own URL state. W1 repositories/query modules own server data access. Shared components own only generic presentation behavior.

## 4. Information hierarchy

### First viewport

Must show, when source-backed:

1. Customer/company identity and CIF.
2. Relationship owner.
3. Most important current attention item.
4. Closest permanence or renewal date.
5. Primary contact.
6. One clear primary action and a compact secondary-action menu.

Absence is explicit: “CIF no informado” is different from an empty string, and “sin contratos activos” is different from a failed contract request.

### Tabs versus anchored sections

Default to anchored sections for overview and related work so the user can scan across domains. Use tabs only when:

- each view contains enough content to justify a separate interaction;
- the active tab is reflected in the URL;
- deep links can restore the selected view;
- hidden tabs do not prevent critical attention from appearing in the overview.

Documents and long activity histories are good tab candidates. Identity, attention and primary contacts are not.

## 5. Presentation contracts requested from W1

Names below describe semantic needs, not final database columns.

| Domain | Minimum UI data | Required semantics |
| --- | --- | --- |
| Customer/company | Stable ID, legal/display name, CIF, status, owner reference | Nullability and status labels |
| Contact | Stable ID, name, role, safe contact methods, primary flag | Preferred method and authorization to reveal/use it |
| Service | Stable ID, product/service label, status, operator reference | Active/suspended/ended semantics |
| Line | Stable ID, masked/display identifier, service/operator reference, status | Which identifiers may be shown or searched |
| Contract | Stable ID, label/number safe for display, status, start/end dates | Date time-zone policy and lifecycle state |
| Permanence | Start/end or canonical end date, status | Whether “remaining days” is server supplied or safe to derive |
| Renewal | Window/date, state and source contract | Meaning of upcoming, due, completed and not applicable |
| Opportunity | Stable ID, title, stage, value when allowed, owner, next follow-up | Stage order and stalled/attention rule |
| Task/meeting | Stable ID, type, due/start time, state, assignee | Completion permissions and overdue semantics |
| Incident | Stable ID, category, severity/status, opened/updated dates | Severity definitions and allowed actions |
| Document | Stable ID, safe filename/label, type, size/date, permissions | Preview/download/upload/delete capabilities |
| Activity | Stable ID, safe summary, kind, timestamp, actor/entity refs | Redaction policy and pagination |

For every collection W1 should also publish:

- pagination or bounded-result policy;
- sort defaults and supported filters;
- loading/empty/not-found/error distinctions;
- stable error codes safe for mapping to UI;
- capabilities/permissions for actions;
- cache/freshness expectations after mutation.

## 6. Section state model

Each independent section uses the same state vocabulary:

```text
idle → loading → ready
              ↘ empty
              ↘ error(retryable | terminal)

ready → refreshing → ready | error-with-stale-data
ready → mutating → ready | rollback-with-error
```

Rules:

- route-level loading establishes stable page geometry;
- identity loads before or with the first critical section;
- section refresh keeps known content visible;
- partial failure names the affected section and preserves all others;
- retry is scoped to the failed query;
- optimistic mutation must retain a rollback snapshot and prevent duplicate submission;
- not-found is a route state, not an empty customer.

## 7. Actions and confirmations

| Action | Default placement | Gate |
| --- | --- | --- |
| Edit customer identity | Header secondary actions | W1 capability/role |
| Create task/meeting | Primary or attention section | Authenticated workspace membership |
| Start contact | Contact row | Integration availability and safe destination |
| Open opportunity | Commercial work | Route authorization |
| Upload document | Documents | Storage capability, size/type policy |
| Delete/archive entity | Overflow/destructive area | Explicit server confirmation and W4 review |
| Ask assistant about customer | Contextual assistant entry | W3 context envelope; no raw page dump |

Unavailable actions remain absent or disabled according to a canonical permission contract. The frontend never treats hiding a control as authorization.

## 8. Assistant context from Customer 360

The page may send only a bounded reference envelope agreed with W3:

```ts
type PageContext = {
  module: 'customers'
  entityType: 'customer'
  entityId: string
  visibleSection?: string
}
```

This is a navigation/query reference, not trusted business data. W3/W1 must re-read and reauthorize the entity server-side. Contact data, contract details, documents and notes are not copied into the prompt from DOM state.

## 9. Responsive behavior

### 320–767 px

- single-column reading order;
- sticky page chrome must not obscure the identity or primary action;
- attention appears before aggregate portfolio counts;
- contact actions use clear labels or accessible icon names;
- dense contract/service rows become cards or disclosure rows;
- no full-page horizontal scrolling.

### 768–1023 px

- identity and attention may form a two-column summary when content length permits;
- anchored-section navigation can become horizontally scrollable with an accessible label;
- secondary details remain below the primary reading flow.

### 1024 px and above

- main content plus a bounded attention/relationship rail is allowed;
- the rail must not duplicate full sections or become the only location for critical data;
- long timelines/tables use the available width without stretching prose excessively.

## 10. Accessibility acceptance

- Route title is the single `h1`; each section has a programmatic heading.
- Summary cards use lists/description lists when they present labelled facts.
- Dates include unambiguous visible labels and machine-readable values where appropriate.
- Status never relies on color alone.
- Contact links expose their purpose and customer/contact name when necessary.
- Section errors receive focus only when triggered by the user's scoped retry/action.
- Dialog/drawer actions trap and restore focus.
- Timeline order is meaningful without visual connector lines.
- Truncated values have an accessible full-value strategy that works without hover.

## 11. Historical component migration

Potentially reusable after canonical review:

- generic section cards, badges, buttons and feedback primitives;
- document manager interaction patterns;
- activity presentation patterns;
- route/section loading and error boundaries;
- responsive drawer/modal mechanics after focus fixes.

Must not be copied as-is:

- property/operation terminology;
- the historical client page's monolithic local state;
- direct browser queries embedded across view components;
- raw metadata tabs or generic “more information” dumps;
- any component that assumes the historical schema or demo-mode branching.

## 12. Implementation sequence after W1 unlocks

1. Create typed customer-detail repository/query adapter from W1 contracts.
2. Implement route not-found/loading/error boundary.
3. Ship identity header plus attention summary with fixture-backed component tests.
4. Add contacts, services/lines and contract timeline as independently testable sections.
5. Add commercial/operational panels and URL-addressable navigation.
6. Add documents/activity after storage and redaction contracts pass W4 review.
7. Add assistant context entry after the W3 envelope is versioned.
8. Run responsive, keyboard, screen-reader and partial-failure acceptance scenarios.

## 13. Required test scenarios

- customer with complete telecom portfolio;
- customer with identity only and no related records;
- missing CIF/owner/primary contact;
- multiple contracts/operators and long labels;
- permanence ended, renewal upcoming and renewal not applicable;
- one section fails while identity and other sections remain usable;
- removed permission while the page is open;
- mutation succeeds, fails with rollback and receives a duplicate click;
- 320 px layout with long company/contact names;
- keyboard-only navigation through sections and actions;
- unsupported assistant/entity contract falls back safely.
