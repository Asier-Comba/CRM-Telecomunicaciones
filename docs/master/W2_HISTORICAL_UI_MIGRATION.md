# W2 historical frontend migration inventory

- Owner: W2
- Date: 2026-09-25
- Source: `iazticontact/crm-inmobiliario-demo` (read-only)
- Destination: `Asier-Comba/CRM-Telecomunicaciones`
- Status: evidence complete; extraction waits for the W1 canonical application

## 1. Purpose

This inventory turns the historical frontend audit into bounded migration decisions. It does not authorize copying routes, data access or inmobiliario terminology into the telecom product.

The historical repository remains read-only. All future implementation must be recreated or adapted in the canonical repository after its runtime, route groups and W1 contracts are known.

## 2. Measured hotspots

Counts below were measured from the historical repository at the W2 audit checkpoint. Hook and data-access counts are signals for decomposition, not a complexity score.

| Route | Lines | `useState` | `useEffect` | Data-access signals | Decision |
| --- | ---: | ---: | ---: | ---: | --- |
| Assistant | 4,374 | 18 | 8 | 5 | P0: do not port page; consume W3 contract through a new renderer boundary |
| Calendar | 2,763 | 16 | 11 | 17 | P0: split calendar shell, event queries, forms and sync controls |
| Opportunities | 2,021 | 17 | 3 | 2 | P0: discard inmobiliario composition; retain generic pipeline interaction ideas only |
| Settings | 1,682 | 15 | 3 | 22 | P0: separate account, workspace, team and integration feature panels |
| Client detail | 1,517 | 22 | 2 | 1 | P0: replace with the Customer 360 boundaries in `W2_CUSTOMER_360_SPEC.md` |
| Inbox | 1,065 | 9 | 5 | 0 | P1: isolate conversation list, thread, composer and assignment controls |
| Clients | 994 | 5 | 3 | 3 | P1: separate URL-backed list state, table and customer form |
| Dashboard | 796 | 4 | 1 | 1 | P1: preserve widget composition concept; replace all metrics/read models |
| Facturación | 646 | 14 | 3 | 0 | P1: keep invoice lifecycle patterns; extract orchestration from route |

The historical audit confirms the reported god-components: five product pages exceed 1,500 lines and the assistant page exceeds 4,000. `src/lib/supabase-queries.ts` is also 2,709 lines, so moving JSX alone would not remove the data-boundary problem.

## 3. Debt map

### P0 — blocks safe telecom implementation

| Finding | Evidence | Required boundary |
| --- | --- | --- |
| Route files own orchestration, state, mutations and presentation | Assistant, calendar, opportunities, settings and client detail pages exceed 1,500 lines | Route composes feature controllers and sections; no business query in shared UI |
| Vertical assumptions cross UI and query modules | Inmobiliario types, demo records, property stages and commission rules are imported by primary routes | W1 read models enter through telecom repositories/query adapters only |
| Assistant behavior is inferred inside one giant client component | Historical assistant mixes threads, cache, intent, integrations, PDF, confirmation and UI cards | W3 owns runtime; W2 owns exhaustive rendering of a versioned response union |
| Loading exists per route but errors are mostly shared at route-group level | Route map has many `loading.tsx` files and one SaaS `error.tsx` | Critical routes need route error plus isolated section errors/refresh states |
| Client detail is a tabbed record aggregator | 22 local state hooks and multiple vertical/invoicing dependencies | Customer 360 identity and attention remain available across partial failures |

### P1 — high-value extraction after canonical base

| Finding | Safe adaptation |
| --- | --- |
| Primitive set exists but contracts are inconsistent | Rebuild Button, Input, Badge, SectionCard, EmptyState and dialog behavior against canonical tokens and accessibility tests |
| Billing UI already has subcomponents | Review `InvoiceEditor`, preview, dashboard, prompt builder and decimal input independently; retain lifecycle semantics only when W1 matches them |
| Documents use a reusable manager | Preserve interaction model after storage permissions, file constraints and error semantics are defined |
| Calendar contains useful layout work | Extract pure date/layout calculations and accessible event presentation after tests; do not inherit integration state |
| Shell/navigation already has responsive mechanics | Review AppShell, Sidebar, Topbar and SideDrawer for focus, landmarks and route terminology before adapting |
| Customer/contact controls have useful interaction patterns | Adapt autocomplete, entity select and contact affordances only after label, permission and null semantics are explicit |

### P2 — polish after core workflows

- Motion and chart presentation, subject to reduced-motion and non-color alternatives.
- Workspace avatar/logo upload ergonomics after storage contracts exist.
- Internal automation/debug surfaces, excluded from the pilot navigation by default.
- Secondary visual density improvements that do not change task priority or information hierarchy.

## 4. Component disposition

| Historical component/pattern | Disposition | Gate before adaptation |
| --- | --- | --- |
| `Button`, `Input`, `Badge`, `SectionCard` | Rebuild from behavior and visual intent | Canonical Tailwind/theme setup and form conventions |
| `EmptyState`, `PageSkeleton` | Adapt taxonomy and stable geometry | Canonical routes, copy and loading strategy |
| `ConfirmDialog`, `SideDrawer` | Adapt after accessibility review | Focus trap/restore, escape/outside-click rules and W4 destructive-action gate |
| `AppShell`, `Sidebar`, `Topbar` | Adapt structure only | Authenticated shell, workspace identity and telecom navigation map |
| `EntityDocumentsManager` | Selectively adapt | W1 storage metadata/actions plus W4 authorization and content gates |
| `InvoiceEditor` and invoicing components | Selectively adapt | W1 billing contract and separate fiscal review |
| `UpcomingDeadlinesPanel` | Replace data model; reuse scan pattern | W1 renewal/permanence semantics and date policy |
| `AutocompleteSelect`, `EntitySelect` | Adapt interaction behavior | Canonical form primitives, async search and accessibility tests |
| `VerticalForms`, `VerticalEditForms` | Do not port | Inmobiliario schema and oversized mixed responsibilities |
| Property/status components and real-estate demo modules | Do not port | Not part of telecom product language or data model |

## 5. Extraction rules

Every adapted unit must satisfy all of these rules:

1. Start from the canonical W1 branch, never from the historical Git history.
2. Copy the smallest behavior that is still useful; rewrite imports, names and data types.
3. Keep W1 queries and W3 runtime calls behind typed feature adapters.
4. Add loading, empty, error, refreshing and mutation states at the same time as the happy path.
5. Add keyboard/focus and narrow-screen acceptance before marking the unit reusable.
6. Remove demo branches, mock tenancy, historical environment flags and vertical fallbacks.
7. Preserve no raw customer data in fixtures, stories, tests or logs.
8. Record provenance in the commit/PR description when code is materially adapted.

## 6. First extraction slices

Once W1 publishes the canonical application, implement in this order:

1. **Feedback foundation:** accessible field, action, empty/loading/error and section state primitives.
2. **Product shell:** semantic landmarks, authenticated workspace identity, desktop sidebar and mobile drawer.
3. **Customer 360 identity:** route state, identity header and attention summary against W1 read models.
4. **Dashboard composition:** server-backed today/renewal/opportunity widgets with independent failure boundaries.
5. **Assistant renderer:** versioned blocks, closed route descriptors and confirmation lifecycle after W3/W4 gates.
6. **Billing shell:** invoice list/status/navigation before editor/PDF work.

Each slice is a separate reviewable commit or PR unit. No slice may import directly from the historical working tree.

## 7. Validation evidence required on migrated code

- lint, typecheck, component/unit tests and production build;
- 320, 375, 768, 1024 and 1440 px review for affected routes;
- keyboard-only traversal and visible focus;
- accessible names, headings, live feedback and dialog focus restoration;
- loading, empty, partial error, retry, stale refresh and mutation rollback where applicable;
- W1-backed field traceability and no invented business metric;
- W4 review for auth, storage, customer data, destructive actions or assistant confirmations.

## 8. Explicit exclusions

This document does not choose the canonical package manager, state/query library, route paths, database fields or API shape. Those decisions depend on the W1 base. It also does not claim the historical billing module is fiscally compliant.
