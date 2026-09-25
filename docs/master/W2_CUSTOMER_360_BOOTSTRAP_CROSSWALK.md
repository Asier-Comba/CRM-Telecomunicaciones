# W2 Customer 360 bootstrap crosswalk

- Owner: W2
- Date: 2026-09-25
- Source reviewed: `w1/bootstrap-canonical` at `0dd2f14`
- Historical route in new bootstrap: `src/app/(saas)/clients/[id]/page.tsx`
- Status: migration decisions ready; W1 telecom contracts still required

## 1. Decision

The existing client detail route is a useful behavioral reference, not the Customer 360 implementation. It combines identity, seven tabs, queries, mutations, form state and vertical rules in a 1,517-line client component with 22 local state hooks.

W2 will not rename this page and continue building on its historical data shape. It will extract interaction patterns into the boundaries in `W2_CUSTOMER_360_SPEC.md` after W1 publishes canonical company/customer and telecom portfolio contracts.

## 2. Current type crosswalk

The bootstrap `Client` type currently exposes:

| Current field | Observed meaning | Customer 360 decision |
| --- | --- | --- |
| `id` | Client record ID | Retain as opaque reference only if W1 declares it canonical |
| `name` | Person/client display name | Cannot double as company identity; W1 must distinguish organization and contact |
| `company` | Free-form company label | Candidate display data only; not legal identity or stable relation |
| `email`, `phone` | Single direct values | Insufficient for multiple contacts, roles, preference and reveal/use permissions |
| `channel` | Lead/source channel | Do not reinterpret as preferred contact method |
| `status` | `active`, `lead`, `inactive`, `churned` | W1 must define organization/customer lifecycle and allowed transitions |
| `leadScore` | Numeric score | Exclude until W1 publishes definition, freshness and action semantics |
| `lastInteraction` | Formatted string | Replace with canonical timestamp/time-zone and activity source |
| `avatar` | Initials/image presentation | Presentation fallback only; not domain data |
| `notes` | Free-form notes | Prefer bounded note records with actor/time/permission; do not expose raw metadata |
| `createdAt` | Optional creation date | Retain only with canonical timestamp/time-zone semantics |
| `metadata` | Mixed vertical/customer attributes | Do not carry forward as the primary contract; normalize or expose typed projections |

Observed `metadata` values include document ID, client type, nationality, preferred language, secondary phone, city/address, service interest, budget, next action and assignee. Some may remain useful, but W2 will not read them from an untyped object in product components.

## 3. Existing route behavior

### Potentially reusable interaction intent

- identity header with status and compact actions;
- direct edit, assistant context entry and customer-linked creation actions;
- documents, tasks, calendar, conversations and billing as related work;
- activity feed and summary counts;
- user-friendly fallbacks for missing display values;
- storage-backed document manager pattern.

### Must be replaced

| Evidence | Risk | Required replacement |
| --- | --- | --- |
| Seven tabs held only in local state | Views cannot be deep-linked/restored/shared | URL-addressable sections or anchored overview |
| Related queries are caught and replaced with `[]` | Failure is indistinguishable from genuinely empty data | Typed per-section result with loading/empty/error/stale states |
| Calendar events may be queried by client name | Collisions/renames can associate the wrong record | Stable customer/contact ID relation from W1 |
| All workspace tasks are loaded then filtered in the browser | Excess data exposure, latency and stale matching | Server-scoped customer task query with tenant authorization |
| Counts are computed from independently partial local arrays | Misleading totals when a query fails or is bounded | Source-backed counts or explicit partial state |
| Page imports direct query and mutation functions | UI, data and action orchestration cannot evolve independently | Feature repository/query adapter plus section controllers |
| Property, service-case and commission rules appear in customer UI | Inmobiliario semantics leak into telecom | Contract/service/line/opportunity panels backed by W1 telecom types |
| Missing fields are normalized through sentinels like `No consta` and `-` | Transport placeholders become business values | Nullable typed fields and presentation-only missing copy |
| Status/labels are mapped in the route | Canonical semantics are duplicated in UI | W1 states plus feature view-model mapping |
| Mutations append local rows and separately create activity | Partial success and rollback are unclear | Server transaction/idempotency contract and read-after-write refresh |

## 4. Existing tabs to target sections

| Existing view | Target Customer 360 boundary | Migration decision |
| --- | --- | --- |
| Resumen | Identity, attention, contacts, portfolio summary | Replace composition and data model |
| Documentos | `CustomerDocuments` | Adapt manager only after storage permission/type/size contracts |
| Operaciones | Opportunities, incidents and services | Split; discard property/service-case assumptions |
| Visitas y citas | Tasks and meetings | Rename and consume stable customer-linked agenda query |
| Tareas | Commercial work | Retain interaction idea; replace list/mutation data flow |
| Conversaciones | Customer communications | Add only when integration and privacy contracts exist |
| Facturación | Billing relation | Retain when W1 provides customer/invoice ownership and permissions |

Contracts, services, lines, operators, permanence and renewal have no equivalent first-class section in the current route and must come from new W1 read models.

## 5. First viewport crosswalk

| Customer 360 requirement | Bootstrap availability | Gate |
| --- | --- | --- |
| Legal/display company identity | Ambiguous `name` + `company` | W1 organization/contact model |
| CIF | Possible untyped `metadata.documentId` mixed with DNI/NIE | W1 typed legal/tax identifier and reveal rules |
| Relationship owner | Possible string `metadata.assignedTo` | W1 stable user reference and capability rules |
| Primary contact | Single client email/phone | W1 contacts collection with primary/preferred semantics |
| Closest renewal/permanence | Absent | W1 contract/term/renewal projection |
| Current operational issue | Historical service cases only | W1 incident model and severity/status definitions |
| Next task/meeting | Available through broad legacy queries | W1 customer-scoped query and due/time-zone semantics |
| Primary safe action | Static UI controls | W1 capabilities plus mutation contracts |

W2 will not simulate missing telecom portfolio data with placeholder counts or metadata fields.

## 6. Required Customer 360 query boundary

W1 may provide one envelope or independent section queries, but W2 needs these presentation results:

```text
customerIdentity(customerId)
customerAttention(customerId, window)
customerContacts(customerId)
customerServices(customerId, pagination)
customerContracts(customerId, pagination)
customerCommercialWork(customerId, pagination)
customerIncidents(customerId, pagination)
customerDocuments(customerId, pagination)
customerActivity(customerId, cursor)
```

This notation defines UI responsibilities, not API names. Each result requires:

- tenant-authorized lookup using stable IDs;
- typed data/nullability and canonical states;
- not-found versus forbidden semantics that do not leak resource existence;
- pagination/bounds and sort order;
- safe error code and retryability;
- freshness/cache behavior;
- per-action capabilities.

## 7. Mutation boundary

The first implementation should be read-first. Mutations enter separately only when W1 publishes:

| Action | Required contract |
| --- | --- |
| Edit identity | Allowed fields, version/conflict behavior, validation and permission |
| Create/complete task | Assignee/due semantics, idempotency and read-after-write |
| Create meeting | Workspace time zone, calendar integration ownership and conflict result |
| Create opportunity | Canonical pipeline/stages, owner and customer relation |
| Upload document | Storage authorization, file policy, scanning and safe metadata |
| Archive/delete | Impact preview, server confirmation, audit and W4 approval |
| Ask assistant | W3 bounded page context; server re-read/reauthorization |

No optimistic mutation is allowed without rollback identity/version and deterministic conflict semantics.

## 8. Component decomposition

```text
CustomerDetailRoute
  -> CustomerDetailRepository / queries
  -> CustomerIdentityHeader
  -> CustomerAttentionSummary
  -> CustomerOverview
       -> ContactPanel
       -> ServicePortfolioSummary
       -> ContractTimelineSummary
  -> CustomerCommercialWork
  -> CustomerOperations
  -> CustomerRecord
```

The route owns ID/URL state and not-found behavior. Sections own presentation and scoped retry. Repository/query adapters own W1 access. Shared UI primitives own no customer types.

## 9. Implementation slices after W1 unlock

1. **Identity route:** stable ID, not-found/forbidden/error, legal/display identity and owner.
2. **Attention:** next task/meeting, closest renewal/permanence and open incident with independent failure states.
3. **Contacts:** primary/secondary contacts and safe contact affordances.
4. **Portfolio:** services, lines/operators and contract timeline with pagination.
5. **Commercial/operations:** opportunities, tasks/meetings and incidents.
6. **Record:** documents, notes and activity after storage/redaction review.
7. **Assistant:** bounded customer context after W3 contract version/navigation gates.

Each slice adds component fixtures for complete, sparse, empty, partial-error and permission-lost states.

## 10. Acceptance scenarios added from bootstrap findings

- two organizations with contacts sharing the same person name;
- organization renamed while linked events/tasks remain stable by ID;
- related section query fails and does not display a false zero;
- bounded list reports more records than currently rendered;
- missing CIF is `null`, not a sentinel string;
- role/owner changes while the page is open;
- route tab/section survives reload and back/forward navigation;
- mutation succeeds but activity refresh fails;
- mutation conflicts with a newer server version;
- assistant receives only customer reference context, not raw notes/contact DOM data.
