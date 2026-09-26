# W2 UI foundation contract

- Owner: W2
- Date: 2026-09-25
- Status: implementation-ready contract; source code waits for canonical W1 application
- Applies to: authenticated CRM Telecom shell and product features

## 1. Decision

The design system is a small product foundation, not a gallery of components. It exists to make urgent telecom work easy to scan, actions predictable and failure recovery consistent.

The canonical application must expose semantic tokens and behavior-first primitives. Feature components may compose them, but may not invent independent focus, error, status or responsive conventions.

This document deliberately avoids fixed library choices, CSS values and route paths until W1 publishes the runtime and existing theme.

## 2. Dependency direction

```text
routes -> feature sections -> shared product patterns -> UI primitives -> semantic tokens
                         \-> W1 query adapters
                         \-> W3 response adapter
```

- Routes own URL/search state, page metadata and composition.
- Features own telecom presentation models and feature actions.
- Shared product patterns own reusable layouts such as attention lists and entity rows.
- UI primitives own interaction, accessibility and visual states only.
- Semantic tokens express role, never a business calculation.
- Data access and authorization never live in UI primitives.

## 3. Semantic token contract

Token names below are requirements; their concrete values must integrate with the canonical Tailwind/theme setup.

| Family | Required roles | Rule |
| --- | --- | --- |
| Surface | canvas, raised, inset, overlay, interactive | Components choose by hierarchy, not arbitrary color |
| Text | primary, secondary, muted, inverse, link, destructive | Muted text must remain readable at normal body sizes |
| Border | default, strong, interactive, error | Focus is never represented by border color alone |
| Action | primary, primary-hover, secondary, ghost, destructive | Only one visually primary action per local decision area |
| Status | neutral, info, success, warning, danger | Every status has text/icon semantics in addition to color |
| Focus | ring, ring-offset | Visible in light/dark surfaces and not suppressed globally |
| Spacing | control, inline, stack, section, page | Feature layouts use a bounded scale; no one-off rhythm |
| Shape | control, card, dialog, pill | Shape communicates component role consistently |
| Elevation | raised, overlay | Shadow does not replace a visible boundary |
| Motion | fast, standard, enter, exit | All non-essential motion has a reduced-motion path |

Contrast targets:

- normal text and form values: WCAG AA 4.5:1;
- large text: WCAG AA 3:1;
- focus indicators and meaningful non-text UI: 3:1 against adjacent colors;
- disabled state remains identifiable without pretending unavailable content is readable body copy.

## 4. Primitive contracts

### Action

One primitive may render a button or navigation link, but its semantic element is explicit and never inferred from styling.

Required variants: primary, secondary, quiet and destructive. Required sizes: compact and standard. Required states: idle, hover, focus, pending and disabled.

- Pending retains its accessible name, adds progress text and blocks duplicate activation.
- Disabled explains a missing prerequisite near the control when the reason is not obvious.
- Icon-only actions require a stable accessible name and at least a 44 by 44 CSS-pixel mobile target.
- A link never simulates a mutation button; a button never simulates navigation.

### Field

`Field` composes label, optional hint, control and error association. Input/select/textarea controls provide value mechanics.

- Labels remain programmatic and visible unless the control is an established search pattern with equivalent visible context.
- Required status is communicated before submission.
- Invalid state uses `aria-invalid` and links to a specific error.
- Server errors are mapped to fields when safe; unknown failures remain form-level.
- Pending submission preserves entered values and prevents duplicates.

### Status badge

Badges present a canonical source status. They never calculate risk or urgency.

- Text is always present.
- Icon and tone are optional reinforcement.
- Unknown values use a neutral safe fallback and produce observable development evidence, not raw payload UI.
- Interactive filters that resemble badges remain actual buttons with pressed state.

### Panel

A panel groups one product question, such as “renovaciones próximas.” It has an optional heading, description, action slot and body.

- Panel headings participate in page heading order.
- A whole panel is a link only when it has exactly one destination and no nested interactive controls.
- Loading/error/empty replace only the panel body whenever the surrounding context remains valid.

### Feedback state

One shared family covers loading, empty, filtered-empty, partial error, route error and not-found. Copy and available actions remain feature-owned.

| State | Primitive behavior |
| --- | --- |
| Loading | Stable geometry, optional delayed polite announcement, reduced-motion support |
| Empty | Title, explanation and at most one primary next action |
| Filtered empty | Names active constraint and exposes clear/reset |
| Partial error | Keeps the section heading/context and scopes retry to failed work |
| Route error | Explains safe recovery and offers retry plus stable navigation |
| Not-found | Does not imply an empty collection; offers a valid parent destination |

### Dialog and drawer

- Accessible name/description; initial focus chosen by task, not always first control.
- Focus remains inside while modal and returns to the opener.
- Escape closes unless an irreversible operation is already being processed.
- Destructive confirmation names the target and effect; it does not rely on color or generic “Are you sure?” copy.
- A mobile drawer follows the same modal focus contract as a dialog.

### Data view

Tables and list/card alternatives share one feature-level column/field definition where possible.

- Critical identity, status, date and next action remain available at narrow widths.
- Sort state is programmatic and URL-backed when it changes the result set.
- Selection count and bulk-action scope are explicit.
- Pagination/loading never empties known rows unnecessarily.
- A horizontally scrollable table has a named scroll region and a deliberate mobile fallback.

### Filter/search bar

- Search input has a clear accessible label, clear action and visible current query.
- Applied filters are visible and individually removable.
- “Clear all” is offered only when more efficient than individual removal.
- URL state is preferred for shareable list views; modal/drawer state is allowed on narrow screens.
- Debounced requests expose progress without announcing every keystroke.

## 5. Product shell and navigation

### Information architecture

The pilot shell uses task-oriented labels. Final route paths depend on the canonical app, but navigation intent is:

| Level | Item | Purpose | Pilot visibility |
| --- | --- | --- | --- |
| Primary | Inicio | Today, attention, renewals and next actions | Always |
| Primary | Clientes | Customer search/list and Customer 360 | Always |
| Primary | Oportunidades | Pipeline and follow-up work | Always |
| Primary | Agenda | Tasks, meetings and calendar | Always |
| Primary | Contratos y servicios | Telecom portfolio, permanence and renewals | When W1 contracts exist |
| Primary | Asistente | Assistant workspace/history | Always; contextual entry also appears in features |
| Secondary | Bandeja | Connected conversations and assignments | When integration is configured |
| Secondary | Facturación | Invoice lifecycle and configuration | According to pilot permission |
| Utility | Ajustes | Account, workspace, team and integrations | Permission-aware |

Rules:

- Active navigation uses `aria-current="page"` or the appropriate current token.
- Badges show actionable counts only when W1 defines scope and freshness.
- Unconfigured optional modules are absent or clearly gated; they do not lead to dead routes.
- Mobile order matches desktop information priority.
- The assistant has contextual entry points, but product features never disappear behind chat.

### Shell landmarks

Required landmarks are skip link, product navigation, optional contextual navigation and one main region. Top bar utilities do not duplicate the full primary navigation.

At narrow widths:

- navigation opens in a labelled modal drawer;
- current page and close action are immediately discoverable;
- opening and closing restore focus predictably;
- main content does not remain keyboard reachable behind the drawer.

## 6. Responsive composition rules

Breakpoints come from the canonical Tailwind configuration; behavior is defined by content needs:

- **Compact:** one reading column, primary task first, no page-level horizontal scroll.
- **Intermediate:** two-column summaries only when reading order remains logical.
- **Wide:** optional bounded context rail; core content never requires the rail to understand critical state.

Components do not accept raw breakpoint-specific business content. The same semantic content reflows, reprioritizes or moves into labelled disclosure without silently disappearing.

## 7. State ownership

| State | Owner |
| --- | --- |
| Route/query/filter parameters | Route or feature controller |
| Remote data/cache/freshness | Canonical query adapter selected with W1 |
| Field draft/validation display | Form/field composition |
| Modal/drawer open state | Nearest stable interaction owner |
| Business status/priority/permission | W1 response; never UI primitive |
| Assistant execution/confirmation | W3 response/lifecycle adapter |
| Toast lifecycle | Shared feedback service; never sole error evidence |

Shared primitives must not import Supabase, W1 entity types, W3 planner logic or feature routes.

## 8. Test contract

Every primitive ships with behavior tests once the canonical runner exists:

| Primitive | Minimum tests |
| --- | --- |
| Action | keyboard activation, pending duplicate prevention, disabled explanation, link/button semantics |
| Field | label, hint/error association, required/invalid state, retained value after failure |
| Badge | text independent of color, unknown fallback |
| Feedback | correct heading/status semantics, scoped retry, no focus theft on passive load |
| Dialog/drawer | initial focus, trap, Escape behavior, restore focus, background isolation |
| Data view | sortable heading semantics, responsive critical fields, selection/bulk scope |
| Filters | query retention, remove/reset, keyboard operation, URL serialization boundary |

Feature tests then cover composition, not duplicate primitive mechanics.

## 9. Implementation gate

Before creating source files W2 must know:

- W1's canonical branch and App Router/layout structure;
- package manager, Node version and test runner;
- Tailwind/theme implementation and existing primitive dependencies;
- authenticated workspace/user contract;
- W4-approved client logging/error boundary behavior.

When those exist, the first code commit will implement the smallest feedback/action/field set with tests. It will not create all primitives at once.
