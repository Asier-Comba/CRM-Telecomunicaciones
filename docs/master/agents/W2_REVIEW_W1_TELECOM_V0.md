# W2 review — W1 `telecom.v0` presentation contracts

- Date: 2026-09-26
- W1 source: `w1/bootstrap-sanitized@75c2103`
- Normative files: `W1_DATA_CONTRACTS_V0.md`, `W1_TENANT_AUTHORIZATION.md`, `src/lib/contracts/telecom-v0.ts`
- Scope: presentation/read integration only; no SQL, endpoint or W4 base acceptance implied

## Accepted contract

- `CustomerCompanyV0` is sufficient for the Identity header seam: opaque identity, legal/display name, typed tax identifier, assigned user, contacts, lifecycle and status.
- `ContactSummaryV0.is_primary` is sufficient to select a primary contact only when W1 guarantees deterministic uniqueness or publishes tie/absence semantics.
- `TelecomContractV0` establishes the minimum relationship among customer, operator, services, lines, commitment and renewal.
- `ServiceLineV0` establishes the common service/line summary needed for a first bounded Customer 360 list.
- `DashboardReadModelV0` correctly isolates widget failure and does not turn an error into an empty result.
- ISO date versus UTC timestamp conventions, explicit `null` and explicit empty collections are accepted.
- These types are adapter inputs. W2 components consume W2 presentation models and do not import database rows or infer authorization from `workspace_id`.

## Missing fields / projections

1. Customer 360 still needs customer-scoped projections for next task, next meeting, alerts and recent activity.
2. Customer contracts and services/lines need collection completeness, bounded pagination/continuation and source freshness.
3. Dashboard needs widget-specific item contracts. The common `{id, customer_id, title, due_at, status}` cannot safely express:
   - task assignee, canonical priority and completion capability;
   - meeting start/end, all-day, time zone, channel/location and join capability;
   - renewal contract reference, canonical date/window, owner and next action;
   - permanence source contract/service, end date, severity/reason and destination;
   - opportunity stage, owner, follow-up state and permitted amount/currency.
4. Read responses need server-issued action/capability descriptors. W2 will not infer edit, reveal, copy, complete, join or navigation permission from roles or field presence.
5. Sensitive fields need field-level visibility/copy semantics compatible with W4: hidden, masked or revealed plus a separate `pii:copy`-equivalent capability.
6. Error codes need a closed safe taxonomy. Arbitrary `DashboardSectionV0.error.message` is not sufficient evidence that provider/database details are safe for users or telemetry.

## Ambiguities

- `TaxIdentifierV0.value`: whether this is full, masked or display-ready is unspecified.
- `renewal_window.status`: W1 says the state is calculable; W2 requires the server/read adapter to supply the canonical state and will not derive `open`, `overdue` or risk from dates.
- Nullable `commitment_end_date`, `end_date`, `assigned_user` and `plan_tariff`: unknown versus not-applicable is not distinguishable where product copy requires it.
- Multiple contacts with `is_primary=true`, or no primary contact, need deterministic semantics.
- `DashboardItemV0.status: string` is open-ended and cannot drive labels, urgency, ordering or empty-state claims exhaustively.
- `due_at` is insufficient for all-day meetings and date-only renewal/permanence windows; operational workspace time-zone rules remain required.
- `workspace_id` is necessary server-side but should normally be stripped from browser presentation data and must never be treated as client authority.

## Breaking changes

- None observed against an earlier accepted W2 runtime contract; no runtime integration exists yet.
- Removing or renaming current `telecom.v0` fields would be breaking.
- Prefer additive widget-specific types and a new Customer Attention projection over widening `status: string` semantics invisibly.

## Minimum requested change

1. Publish a `CustomerAttentionReadModelV0` or equivalent independent section projections.
2. Publish discriminated Dashboard item types per widget while retaining the current section envelope.
3. Add completeness/continuation/freshness metadata to bounded collections.
4. Add opaque server-issued capability descriptors and sensitive-field reveal/copy state.
5. Publish closed safe error codes and workspace operational time-zone/window semantics.

Until these additions land, W2 accepts `telecom.v0` for adapter and fixture preparation, not for final action-rich Customer 360 or Dashboard implementation.

## Live delta — `w1/canonical-v3@32f0112`

| Classification | Delta |
| --- | --- |
| ADDED | Server tenant resolver now requires both active workspace and active membership; W2 accepts it as the tenant-scope boundary. |
| REMOVED | None in `telecom.v0`. |
| BREAKING | None in `telecom.v0`. |
| AMBIGUOUS | Resource-level Customer/Dashboard reads, cache epoch/invalidation, capability projection and safe client error-code mapping remain unpublished. The browser identity provider is UX context, not authorization. |
| ACCEPTED | Existing Customer, Contract, Service/Line and Dashboard v0 presentation fields remain accepted without inferring SQL, writes, completeness or permission. |

This delta does not accept PR `#14` as an integration base; only W4 can name
that SHA after its independent gate.
