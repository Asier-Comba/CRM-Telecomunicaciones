# W2 frontend bootstrap and migration contract

- Owner: W2
- Date: 2026-09-25
- Status: active until the canonical application base is published
- Historical source: `iazticontact/crm-inmobiliario-demo` (read-only)
- Delivery repository: `Asier-Comba/CRM-Telecomunicaciones`

## 1. Decision

W2 will not create a second application while W1 is establishing the canonical base. Frontend work begins with repository-native contracts, then adapts proven pieces from the historical CRM in small slices after the canonical App Router and data contracts exist.

Previous W2 work remains useful as evidence and a source of implementation patterns, but it must not be cherry-picked wholesale. It was built on an inmobiliario branch and contains vertical-specific imports, routes and view models.

## 2. Previous work classification

| Previous unit | Decision | Adaptation gate |
| --- | --- | --- |
| Accessible shared input | Reuse concept and tests | Canonical form API and styling tokens exist |
| SaaS route error boundary | Reuse behavior | Canonical route groups and error-reporting contract exist |
| Route loading skeletons | Reuse presentational pattern | Canonical routes and reduced-motion policy exist |
| Shared empty states | Reuse taxonomy and primitive | Canonical copy and route intents are known |
| Dashboard model/components boundary | Adapt, do not copy blindly | W1 dashboard read model is stable |
| Operational widgets: today/deadlines/activity | Adapt visual boundary | Telecom task, renewal and activity contracts exist |
| Facturación PRO UI | Audit and selectively port | W1 billing model and later fiscal review exist |
| Inmobiliario navigation/copy/view models | Do not port | Replace with telecom information architecture |

The local recovery bundle retains the original W2 commits, including `f8b6466`, plus the last uncommitted dashboard boundary. It is recovery material only and must not be pushed to the historical repository.

## 3. Target frontend boundaries

```text
src/
  app/
    (auth)/
    (saas)/
  components/
    ui/
    layout/
    feedback/
  features/
    dashboard/
    customers/
    contracts/
    renewals/
    opportunities/
    calendar/
    billing/
    assistant/
```

This is a dependency direction, not a requirement to create every folder immediately:

- routes compose features and own URL state;
- features own presentation models, controllers and domain-specific UI;
- shared components contain no telecom business rules;
- W1 contracts are consumed through typed repositories/query modules;
- W3 owns planner semantics; frontend only renders the versioned response contract;
- authorization remains server-side even when UI hides unavailable actions.

## 4. Migration sequence

### Slice A — product shell and feedback

- App shell, navigation landmarks and mobile drawer.
- Accessible input/button primitives.
- Route loading, error and empty states.
- Reduced-motion and keyboard-focus baseline.

Acceptance: keyboard navigation, semantic landmarks, no horizontal overflow at 320 px, and W4 quality scripts passing.

### Slice B — telecom command center

- Source-backed tasks and meetings for today.
- Renewal/permanence alerts from W1 dates and statuses.
- Opportunities requiring follow-up.
- Recent activity and relevant customers.
- Assistant entry point carrying current-page context.

Acceptance: every metric and alert traces to a W1 field/query; zero placeholder business metrics in real mode.

### Slice C — customer 360

- Identity and CIF.
- Contacts and owner.
- Services, lines, operators and contracts.
- Permanence/renewal timeline.
- Opportunities, tasks, meetings, incidents, documents, notes and activity.

Acceptance: progressive loading/error isolation per section, useful empty states and no invented canonical fields.

### Slice D — assistant as product interface

- Structured result renderer.
- Entity cards/tables with deep links.
- Proposed-action preview and explicit confirmation UI.
- Execution states, recoverable errors and history.

Acceptance: exhaustive rendering of the W3 union, no planner/business inference in React, and W4 confirmation gates preserved.

### Slice E — billing adaptation

- Preserve invoice lifecycle, items, numbering, PDF, configuration and trash behaviors that match the canonical model.
- Improve navigation, forms, feedback and responsive tables incrementally.
- Defer fiscal-compliance claims to a dedicated review.

## 5. Product rules

- The first screen answers what to do today and who needs attention.
- Navigation names customer, service, contract and renewal concepts directly.
- Default tables prioritize next action, owner and time sensitivity over database fields.
- Filters remain visible, reversible and URL-shareable where useful.
- Loading keeps layout stable; errors explain recovery; empty states distinguish first use from no results.
- Mobile preserves the primary action and critical status without forcing horizontal scrolling.
- The assistant links back into product entities and never becomes an isolated chat-only surface.

## 6. Required validation per slice

- Exact remote check before push: `git remote -v` must show `Asier-Comba/CRM-Telecomunicaciones`.
- Reproducible install using the committed lockfile and pinned Node runtime.
- Lint, typecheck, unit/component tests and production build.
- Responsive review at 320, 375, 768, 1024 and 1440 px for affected flows.
- Keyboard and basic screen-reader review for navigation, forms, dialogs and status feedback.
- Loading, error, first-use empty and filtered-empty states.
- No secrets, customer data, tenant identifiers or raw assistant payloads in fixtures/logs.
- W4 review when auth, RLS, sensitive logging, external actions or assistant confirmation is affected.

## 7. Rebase/adaptation protocol

When W1 publishes the canonical base:

1. Fetch and read W1/W3/W4 status files and recent commits.
2. Rebase the W2 documentation branch onto the declared integration base.
3. Run the baseline gates before source changes.
4. Compare each previous W2 unit against canonical components and contracts.
5. Re-implement the smallest valid slice; do not copy historical imports or data access implicitly.
6. Validate, self-review, commit, check `git remote -v`, push and update `W2_STATUS.md`.
