# W2 dashboard slice 1 — Command Center work queues

- Owner: W2
- Date: 2026-09-25
- Status: implementation blueprint ready; inputs remain `CONTRACT_REQUIREMENT`
- Scope: Today, tasks, meetings, renewals, permanence alerts and opportunities

## 1. Slice outcome

The first dashboard slice answers what the user should do today and which near-term commercial items need attention. It contains no decorative KPI, trend or locally derived risk score.

## 2. Component tree

```text
DashboardRoute
├── DashboardRouteBoundary
└── CommandCenterSlice
    ├── CommandCenterHeader
    │   ├── ScopeAndFreshness
    │   └── QuickActions
    ├── TodaySection
    │   ├── TodayTaskList
    │   └── TodayMeetingList
    ├── UpcomingRenewalsWidget
    ├── PermanenceAlertsWidget
    └── OpportunityFollowUpWidget
```

The route owns viewer/date/filter URL state. Widgets own presentation and scoped retry. W1 query adapters own remote data/cache behavior. Shared UI primitives own only generic state/layout.

## 3. Slice envelope requirements

| ID | `CONTRACT_REQUIREMENT` | Needed semantics |
| --- | --- | --- |
| W1-DASH-01 | Viewer scope | Personal/team scope, stable viewer/team reference and permission to change scope |
| W1-DASH-02 | Workspace time | Canonical time zone, current operational day and inclusive/exclusive window |
| W1-DASH-03 | Freshness | Generated/fetched time, stale policy and refresh/invalidation behavior |
| W1-DASH-04 | Partial result | Per-widget success/failure/stale state and safe retry identity |
| W1-DASH-05 | Capabilities | Per-action permission/capability descriptors; server enforcement |
| W1-DASH-06 | Navigation | Stable entity references; W2 typed route builders, never arbitrary URLs |

These IDs express UI needs, not API field names.

## 4. Widget contracts

### Today / Tasks

| Concern | Requirement |
| --- | --- |
| Source | `CONTRACT_REQUIREMENT[W1-DASH-TASKS]`: customer-scoped/workspace-authorized task projection |
| Contract | Stable task/customer refs, safe title, canonical state, due timestamp/time zone, assignee, priority only if canonical, allowed actions |
| Ordering | W1 priority when supplied, then due timestamp, then stable ID |
| Loading | Stable list rows, one section loading announcement, no false empty |
| Empty | “No tienes tareas para hoy” only after complete successful query for declared scope/window |
| Error | Keep other widgets; scoped retry; stale known rows remain marked when allowed |
| Click | Task detail or customer detail through typed descriptor; row-wide link only with one destination |
| Permissions | Read projection; completion/edit actions require explicit capabilities and server authorization |
| Freshness | Show dashboard envelope freshness; mutation requires read-after-write/invalidation semantics |

### Today / Meetings

| Concern | Requirement |
| --- | --- |
| Source | `CONTRACT_REQUIREMENT[W1-DASH-MEETINGS]`: authorized meeting/calendar projection |
| Contract | Stable meeting/customer refs, title, start/end/all-day, workspace/event time zone, state, safe location/channel, allowed join/edit actions |
| Ordering | Chronological by canonical start; all-day ordering defined by W1 |
| Loading | Stable chronological rows without placeholder times |
| Empty | Clear-day copy only after complete success; offer create meeting when permitted |
| Error | Scoped retry; do not imply free calendar when query failed |
| Click | Meeting/calendar detail and customer reference through typed route descriptors |
| Permissions | Read/join/edit/reschedule separately described; external calendar ownership respected |
| Freshness | Sync source/status and freshness semantics supplied by W1 when relevant |

### Upcoming renewals

| Concern | Requirement |
| --- | --- |
| Source | `CONTRACT_REQUIREMENT[W1-DASH-RENEWALS]`: authorized contract renewal projection |
| Contract | Stable customer/contract refs, safe label, canonical renewal state, relevant date/window/time zone, owner and next action when recorded |
| Window | Explicit server-defined or request-supported window; UI always displays it |
| Loading | Bounded list geometry; no synthetic count |
| Empty | “Sin renovaciones en [window]” only for successful complete/bounded result |
| Error | Scoped retry; omit totals when completeness is unknown |
| Click | Contract or customer detail via closed descriptor; optional filtered renewal view |
| Permissions | Read and navigation capabilities; mutations outside slice 1 |
| Freshness | Generated time plus contract source update semantics |

### Permanence alerts

| Concern | Requirement |
| --- | --- |
| Source | `CONTRACT_REQUIREMENT[W1-DASH-PERMANENCE]`: authorized permanence/term projection |
| Contract | Stable source contract/service/customer refs, canonical state, end/window, server-defined severity/reason and allowed destination |
| Ordering | W1 severity/priority, then relevant date, then stable ID |
| Loading | Card/list skeleton matching expected rows; no derived urgency labels |
| Empty | “Sin permanencias que requieran atención” only when W1 returns a complete attention result |
| Error | Scoped retry and stale marker; never convert raw dates into risk locally |
| Click | Source contract/service/customer destination through route registry |
| Permissions | Authorized safe alert projection; acknowledgement only with later mutation contract |
| Freshness | Alert generation/freshness explicit; time window visible |

### Opportunity follow-up

| Concern | Requirement |
| --- | --- |
| Source | `CONTRACT_REQUIREMENT[W1-DASH-OPPORTUNITIES]`: authorized opportunity follow-up projection |
| Contract | Stable opportunity/customer refs, title, canonical stage, owner, next follow-up timestamp/state, amount/currency only when allowed, W1 attention reason |
| Ordering | Canonical priority/attention order, follow-up timestamp, stable ID |
| Loading | Stable rows; no placeholder value/percentage |
| Empty | State no follow-ups in current scope and link to full opportunities view |
| Error | Scoped retry; keep successful agenda/renewal widgets |
| Click | Opportunity detail or filtered opportunities view through typed descriptor |
| Permissions | Read/navigation; edit/move-stage deferred until W1 mutation contract |
| Freshness | Projection generated time and mutation invalidation behavior |

## 5. Today composition

`TodaySection` is a visual grouping, not a frontend aggregation algorithm. W1 must define the operational day/window and task/meeting inclusion semantics.

- Tasks and meetings remain distinguishable lists.
- A combined chronological mobile view is allowed only if the adapter receives comparable canonical timestamps and types.
- Counts are shown only when the result declares completeness/bounded total.
- Completing a task is not required for the read-first implementation; it enters later behind W1 mutation semantics.

## 6. Page and widget states

| State | Behavior |
| --- | --- |
| Route loading | Header and critical work-queue geometry; one polite status |
| Widget loading | Replace widget body only; preserve heading and layout |
| Ready | Show declared scope/window/freshness and source-backed rows |
| Empty | Widget-specific successful empty copy and one useful action when permitted |
| Partial | Preserve successful widgets; mark failed/stale widgets individually |
| Refreshing | Keep known rows visible and attach progress to refresh control |
| Error | Scoped safe copy/retry; no false zero/count |
| Forbidden | Permission-safe absence/denial without revealing other tenant data |
| Stale | Visible timestamp/label plus retry; do not imply current state |

The route fails only when viewer/workspace/date context cannot be established safely.

## 7. Navigation and actions

- All row/card destinations resolve through `CONTRACT_REQUIREMENT[W1-DASH-06]` plus W2's typed route registry.
- Date/scope filters are URL-backed when shareable and authorized.
- Quick actions are capability-driven and limited to configured pilot actions.
- No card has both a row-wide link and nested conflicting controls.
- Assistant entry attaches `{ module: 'dashboard', visibleSection }` only after W3 context/version requirements are stable.
- No assistant mutation control is part of dashboard slice 1.

## 8. Responsive behavior

### Compact

1. Header/scope/freshness.
2. Today's tasks.
3. Today's meetings.
4. Upcoming renewals.
5. Permanence alerts.
6. Opportunity follow-ups.

Rows show customer/reason, relevant date/time/state and one destination. Secondary facts move to detail/disclosure. No page-level horizontal scrolling.

### Intermediate

- Tasks and meetings may share two columns when content remains readable.
- Renewals and permanence may share a row but retain independent states.
- Opportunities span available width when labels/context need it.

### Wide

- Today occupies the main column.
- Upcoming queues may use a bounded secondary column/rail.
- Critical information is not duplicated exclusively into the rail.

## 9. Accessibility

- Single page `h1`; widget headings form a logical outline.
- Homogeneous queues use lists; tables only when comparison across columns is meaningful.
- Dates, status and severity are textually named.
- Row links/actions include customer/entity context.
- Refresh/retry does not steal focus or reset reading position.
- Removed/completed items announce changes without moving focus to page start.
- Skeleton children are silent; one loading status per affected region.
- Compact touch targets and visible focus meet the UI foundation contract.

## 10. Contract fixtures

Required synthetic scenarios:

- mixed complete day with tasks, meetings, renewal, permanence alert and opportunity;
- completely clear successful day;
- team scope versus personal scope;
- all-day and timed meetings near the workspace day boundary;
- overdue/today semantics supplied by W1;
- renewal/permanence not applicable versus absent;
- opportunity without allowed amount;
- one widget retryable failure while others succeed;
- stale rows after refresh failure;
- bounded result with more rows available;
- permission removed while loaded;
- unknown source state handled neutrally;
- long labels at 320 px.

The transport-neutral acceptance scenarios are versioned in
`docs/master/fixtures/W2_CUSTOMER_DASHBOARD_UI_STATE_FIXTURES.json`. They test W2
state semantics only and must not be treated as a W1 API schema.

## 11. Tests

### Contract/adapter

- Exhaustive canonical status mapping or neutral unsupported fallback.
- Correct workspace time-zone windows and deterministic ordering.
- Partial result never yields false totals/empty copy.
- Entity references become typed route descriptors, never concatenated URLs.
- Amount is rendered only with currency/permission semantics.

### Component

- Every widget loading/ready/empty/error/stale/forbidden state.
- Scope/window/freshness visible and accessible.
- Long content, bounded list and compact layout.
- Links versus buttons and repeated-label accessible names.

### Integration

- Independent query success/failure.
- URL scope/date restoration.
- Permission change and safe retry.
- 320, 375, 768, 1024 and 1440 px.
- Keyboard-only and reduced-motion paths.

## 12. Definition of done

- Every W1-DASH requirement maps to a versioned W1 contract.
- No locally invented KPI, risk, priority, count or date window.
- All widgets expose source/window/freshness and independent states.
- No presentational widget imports Supabase or W1 database rows.
- CI/build/component tests and W4 gates pass on the accepted base.
- Responsive/accessibility evidence accompanies the implementation PR.
