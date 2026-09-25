# W2 vertical slice 1 — Customer 360 Identity + Attention

- Owner: W2
- Date: 2026-09-25
- Status: implementation blueprint ready; all domain inputs remain `CONTRACT_REQUIREMENT`
- Implementation gate: sanitized W1 base with green CI plus explicit W4 frontend-integration approval

## 1. Slice outcome

In one viewport, a commercial user can identify the company and understand the nearest work/risk without opening several modules.

The slice must show, when authorized and source-backed:

- company identity;
- CIF;
- primary contact;
- assigned salesperson;
- customer status;
- next task;
- next meeting;
- active contracts;
- nearest permanence end;
- nearest renewal;
- relevant alerts.

No field name, enum, endpoint or database relation in this document is canonical. Every missing backend decision is marked `CONTRACT_REQUIREMENT`.

## 2. Component tree

```text
Customer360Route
├── CustomerRouteBoundary
│   ├── RouteLoading
│   ├── CustomerNotFound
│   └── CustomerRouteError
└── CustomerIdentityAttentionSlice
    ├── CustomerIdentityHeader
    │   ├── CompanyIdentity
    │   ├── CustomerStatus
    │   ├── AssignedSalesperson
    │   └── CustomerPrimaryActions
    ├── PrimaryContactCard
    └── CustomerAttentionGrid
        ├── NextTaskCard
        ├── NextMeetingCard
        ├── ActiveContractsCard
        ├── NearestPermanenceCard
        ├── NearestRenewalCard
        └── RelevantAlertsList
```

Ownership:

- `Customer360Route` owns route params, URL state and page metadata.
- `CustomerRouteBoundary` distinguishes not-found, forbidden-safe response and route failure.
- `CustomerIdentityAttentionSlice` composes independent presentation results.
- Cards render view models and emit intents; they never query Supabase directly.
- A W1-backed repository/query adapter maps canonical contracts into W2 view models.
- Server authorization is authoritative even when a UI action is absent or disabled.

## 3. View-model seam

W2 will define the final TypeScript view model only after W1 publishes contracts. The adapter must satisfy these conceptual slots:

```text
CustomerIdentityView
  customer reference     -> CONTRACT_REQUIREMENT[W1-C360-01]
  display/legal identity -> CONTRACT_REQUIREMENT[W1-C360-02]
  CIF display policy     -> CONTRACT_REQUIREMENT[W1-C360-03]
  canonical status       -> CONTRACT_REQUIREMENT[W1-C360-04]
  assigned salesperson   -> CONTRACT_REQUIREMENT[W1-C360-05]
  allowed actions        -> CONTRACT_REQUIREMENT[W1-C360-06]

CustomerAttentionView
  primary contact        -> CONTRACT_REQUIREMENT[W1-C360-07]
  next task              -> CONTRACT_REQUIREMENT[W1-C360-08]
  next meeting           -> CONTRACT_REQUIREMENT[W1-C360-09]
  active contracts       -> CONTRACT_REQUIREMENT[W1-C360-10]
  nearest permanence     -> CONTRACT_REQUIREMENT[W1-C360-11]
  nearest renewal        -> CONTRACT_REQUIREMENT[W1-C360-12]
  relevant alerts        -> CONTRACT_REQUIREMENT[W1-C360-13]
  freshness/partial      -> CONTRACT_REQUIREMENT[W1-C360-14]
```

These are UI requirement identifiers, not proposed API property names.

## 4. Contract requirements

| ID | UI need | Minimum semantics W1 must publish |
| --- | --- | --- |
| W1-C360-01 | Customer reference | Stable opaque ID, entity kind and tenant-authorized lookup behavior |
| W1-C360-02 | Company identity | Display name, legal name relationship and nullability; organization versus person semantics |
| W1-C360-03 | CIF | Safe display/masking/search policy, nullability and legal-identifier type |
| W1-C360-04 | Status | Closed canonical values, localized label source, lifecycle meaning and allowed transitions |
| W1-C360-05 | Assigned salesperson | Stable user reference, display label, active/inactive state and reveal permission |
| W1-C360-06 | Actions | Per-action capability flags or descriptors; server remains authoritative |
| W1-C360-07 | Primary contact | Stable contact reference, name/role, primary/preferred semantics and permitted contact methods |
| W1-C360-08 | Next task | Stable task reference, canonical state, due timestamp/time zone, assignee and completion capability |
| W1-C360-09 | Next meeting | Stable meeting reference, start/end/all-day/time zone, state and safe location/channel |
| W1-C360-10 | Active contracts | Stable contract references, canonical active meaning, bounded/count semantics and destination descriptor |
| W1-C360-11 | Permanence | Source contract/service, canonical end/window, state and whether remaining time is server-supplied |
| W1-C360-12 | Renewal | Source contract, canonical date/window and state such as upcoming/due/completed/not-applicable |
| W1-C360-13 | Alerts | Stable alert reference, server-defined severity/priority, safe reason, source entity and action/destination |
| W1-C360-14 | Result envelope | Generated/freshness time, partial-section status, safe error codes, retryability and permissions |

All date contracts require workspace time-zone policy and unambiguous ISO transport. W2 does not infer risk, “overdue,” “soon” or “active” from raw dates/status strings without W1 semantics.

## 5. Data composition

W1 may deliver one bounded projection or independent queries. W2 requires independent state ownership even if transport is aggregated:

| Section | Hard dependency | May fail independently |
| --- | --- | --- |
| Identity header | W1-C360-01 through 06 | No; identity failure becomes route state |
| Primary contact | W1-C360-07 | Yes |
| Next task | W1-C360-08 | Yes |
| Next meeting | W1-C360-09 | Yes |
| Active contracts | W1-C360-10 | Yes |
| Permanence | W1-C360-11 | Yes |
| Renewal | W1-C360-12 | Yes |
| Alerts | W1-C360-13 | Yes |

A section result needs a distinct state for success with data, success with no data, permission-hidden/denied, retryable failure, terminal failure and stale known data.

## 6. State behavior

### Initial loading

- Render route geometry matching the identity header and attention grid.
- Use one polite loading status; skeleton blocks are hidden from assistive technology.
- Do not flash false zero counts or “no data” before the request resolves.
- Respect reduced motion.

### Empty

- Missing CIF: “CIF no informado,” only when W1 returns an authorized null value.
- No primary contact: explain absence and offer create/assign only if capability exists.
- No next task/meeting: state that none is scheduled; never treat query failure as clear agenda.
- No active contracts: state it only when the canonical active query succeeded completely.
- No permanence/renewal: distinguish none, not applicable and unknown.
- No alerts: state “Sin alertas relevantes” only for a successful, fresh result in the declared scope.

### Partial data

- Identity remains visible when any attention section fails.
- Successful sections remain interactive.
- Failed sections identify only their own unavailable data and expose scoped retry.
- Known stale content remains visible with freshness label when W1 marks it safe.
- Aggregate counts are omitted when completeness is unknown.

### Error

- Invalid/unknown route reference maps to not-found without leaking cross-tenant existence.
- Authorization failure uses W1/W4 safe semantics and never reveals whether the entity exists elsewhere.
- Route error preserves a safe parent destination and retry.
- Section error never clears unrelated known data.
- Raw SQL, provider messages, identifiers and payloads never render or enter client logs.

## 7. Permissions and actions

| Surface | Read requirement | Action requirement |
| --- | --- | --- |
| Identity/CIF | Authorized customer identity projection | Edit capability plus W1 mutation contract |
| Contact | Authorized contact projection and reveal policy | Contact/create/edit capability and integration readiness |
| Salesperson | Authorized member label | Reassign capability and valid assignee set |
| Task | Authorized customer-scoped task | Complete/edit capability, version/conflict and idempotency semantics |
| Meeting | Authorized customer-scoped meeting | Join/edit/reschedule capability and calendar ownership |
| Contracts | Authorized customer contract projection | Navigation permission; mutations outside slice 1 |
| Alerts | Authorized safe alert projection | Only server-defined acknowledge/navigate actions |
| Assistant | Customer reference may be attached | W3 READ UI only; no mutation confirmation in slice 1 |

The frontend may hide unavailable controls for clarity but never treats hiding as enforcement.

## 8. Navigation/deep links

All destinations use closed route descriptors resolved by W2 after W1 taxonomy exists:

- customer identity/current page;
- contact detail/edit;
- task detail;
- meeting/calendar detail;
- contract detail or customer-filtered contracts;
- alert source entity;
- assigned salesperson/team view when authorized.

`CONTRACT_REQUIREMENT[W1-C360-ROUTES]`: W1 supplies stable entity references; W2 supplies typed route builders. No model/backend arbitrary URL is rendered.

## 9. Responsive behavior

### 320–767 px

- One column: identity, primary contact, next task, next meeting, contract/permanence/renewal, alerts.
- Company name and CIF wrap without obscuring status.
- Primary action remains reachable; secondary actions use a labelled overflow menu.
- Each card shows label, critical date/state and one action; secondary facts use disclosure/detail.
- No page-level horizontal scroll.

### 768–1023 px

- Identity spans full width.
- Contact and immediate work may form two columns.
- Contract/permanence/renewal cards form a responsive grid without equal-height filler.

### 1024 px and above

- Identity and primary attention remain in the main reading column.
- A bounded relationship rail may hold contact/owner, but critical alerts never live only in the rail.
- Long values retain readable line length and accessible full context.

## 10. Accessibility

- Exactly one route `h1`, containing the company/customer display identity.
- Identity facts use a description list where appropriate.
- Dates have clear visible labels and machine-readable values where useful.
- Status, alert severity and urgency never rely on color alone.
- Repeated “Abrir” or “Ver” links include entity context in accessible names.
- Section headings preserve a logical outline.
- Scoped retry returns focus to the section heading only after a user-triggered recovery result requires it.
- Dynamic completion/removal announces status without moving focus to page start.
- Contact actions disclose method/destination safely and meet compact touch-target requirements.
- Skeletons and decorative icons are silent.

## 11. Contract fixtures

Before implementation W2 requires non-customer fixtures for:

1. complete company with every attention item;
2. identity only with all related sections successfully empty;
3. missing CIF, owner and primary contact;
4. permissions that hide contact methods but allow identity;
5. multiple active contracts with bounded/partial collection;
6. permanence ended, upcoming and not applicable;
7. renewal upcoming, due, completed and unknown;
8. one section retryable failure with all others successful;
9. stale successful data plus refresh failure;
10. cross-tenant/forbidden-safe route result;
11. long Spanish company/contact names at 320 px;
12. permission removed while the page is open.

Fixture values must be synthetic and carry no production/customer data.

## 12. Tests

### Contract/adapter

- Every W1 status/nullability value maps exhaustively or to a neutral unsupported fallback.
- Invalid/extra transport fields are rejected by the canonical validator.
- Unknown status never becomes a positive/negative business claim.
- Dates respect workspace time zone and day-boundary cases.
- Partial result never produces a false total or empty claim.

### Component

- Identity complete/sparse/long values.
- Every card loading/empty/ready/error/stale state.
- Permission-visible, hidden and disabled-with-reason actions.
- Scoped retry, mutation pending/duplicate prevention where later enabled.
- Heading, description-list, accessible-name and live-status semantics.

### Integration

- Authorized route success.
- Safe not-found/forbidden behavior.
- Independent section failure and retry.
- Back/forward URL restoration.
- 320, 375, 768, 1024 and 1440 px.
- Keyboard-only and reduced-motion review.

## 13. Definition of done

- All W1-C360 requirements link to a versioned W1 contract.
- W4 accepts the base and relevant auth/PII boundaries.
- Identity plus every attention section implements loading, empty, ready, partial/error and permission behavior.
- No direct Supabase call exists inside presentational components.
- No inmobiliario type, sentinel (`No consta`, `-`) or untyped metadata drives the UI.
- Lint, typecheck, component tests, production build and applicable W4 gates pass.
- Responsive/accessibility evidence is attached to the implementation PR.
