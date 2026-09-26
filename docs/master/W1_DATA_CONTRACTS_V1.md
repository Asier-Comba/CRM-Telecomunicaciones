# W1 — Telecom data/read contracts v1

- Wire version: `telecom.v1`
- Source: `src/lib/contracts/telecom-v1.ts`
- Base: `w1/canonical-v3@32f0112`
- Consumer snapshots: W2 `db8ab41`; W3 `c6e869e`
- Status: contract and authorized service boundary published; DB adapter not implemented

## Compatibility

`telecom.v0` remains frozen. V1 uses separate DTOs/parsers because W2's v0
parsers reject unknown keys. The exported `TELECOM_V1_CHANGESET` identifies
ADDED, BREAKING, DEPRECATED and REMOVED entries. No v0 endpoint may silently
return v1.

## Invariants

- Collection envelopes distinguish available, unsupported, unavailable,
  unauthorized and error states, plus completeness, continuation and freshness.
- An empty array is truthful only with available, complete source evidence.
- Base readers return sensitive fields only as unavailable, hidden or masked.
  Reveal/copy is short-lived, server-issued, reauthorized and separately audited.
- Safe errors contain a closed code and optional opaque correlation only.
- Dashboard items are discriminated; there is no generic `status: string`.
- `workspace_id` is server context, never a read input from browser/model.
- Inputs are closed at runtime; unknown keys, invalid enums, invalid windows and
  caller-selected workspace fields fail before authorization or persistence.
- Every repository response must match both `telecom.v1` and the request
  `scope_epoch`; a mismatch fails closed as access revoked.

## Published projections

- `CustomerCompanyV1`
- `TelecomContractV1`, `TelecomServiceV1`, `TelecomLineV1`
- `CustomerSummaryV1`
- `CustomerAttentionV1`: task, meeting, renewal, permanence, alerts, activity
- `DashboardV1`: today, tasks, meetings, renewals, permanence, opportunities
- `CollectionEnvelopeV1<T>`
- protected/revealed field and capability contracts

## Read surface

The catalog exports 14 READ operations. This intentionally includes
`opportunity.list`: live W3 has that capability, so the earlier “13” count was
not exact. Task/meeting writes remain blocked.

`src/lib/server/telecom-read-service-v1.ts` is the runtime orchestration
boundary: it authorizes exact operations and calls an injected repository. It
does not query tables and no repository adapter, route, raw-table grant,
Supabase apply or production claim exists yet.

Activity summaries are rendered only from the closed map in
`src/lib/server/activity-summary-v1.ts`; unknown codes produce a constant safe
fallback and never echo stored or caller-provided text.
