# product.v1 — tasks, calendar and pipeline (B3 candidate)

Normal human application operations only. Existing telecom.v1 and W3 grants stay unchanged. Types: `product-work-v1.ts`, `product-queries-v1.ts`; service: `ProductServiceV1`. Inputs are closed, IDs are UUIDs, command_id is reused for retry. Edits and transitions require id + positive expected_version. PostgreSQL manages versions; one transaction commits entity, receipt, coded activity and audit. Changed retry arguments conflict; stale edits conflict. Every replay rechecks current membership. No actor/workspace/version/source/status authority may be supplied by the browser.

| Family | Writes | Fields / policy |
|---|---|---|
| task | create, update, start, complete, reopen, cancel | title; nullable due_at/priority/assigned_user_id; customer_id/opportunity_id fixed at create. Canonical pending/in_progress/completed/cancelled. No separate invented archive state. start only pending; complete/cancel only unfinished; reopen only completed/cancelled. |
| meeting | create, update, reschedule, complete, cancel, no_show | title, starts_at, nullable ends_at, IANA timezone, all_day, channel, assignee. Customer/opportunity fixed at create. Edits/transitions only scheduled; completion/cancel/no_show terminal. Reschedule requires new start and end, preserving explicit duration intent. |
| opportunity | create, update, change_stage, assign, win, lose, reopen, archive | canonical stage UUID; title/owner, amount_minor+currency supplied together, expected_close_date, next_follow_up_at, next_action. Customer immutable. Normal edits only manual/open. Archive maps to canonical cancelled + coded archived reason. |

Pipeline lifecycle graph: open → open/won/lost/cancelled; won/lost → open using reopen. An open stage has null outcome; win/lose require an active stage with the matching canonical outcome. Cancelled is terminal. Open stages may move in either direction; this is an explicit candidate product policy, not a caller-trusted stage label. Stage catalog is workspace-owned, bounded and read-only through this interface. Opportunity stage/value/owner/link changes create coded history with version, transition references and operation, never raw before/after text or fiscal/contact payloads.

Opportunity inputs may specify one contract_id, service_id and plan_id each. Links are normalized and protected with tenant composite foreign keys. Commands additionally require same customer for contract/service, and a linked service must match the linked contract. Active plans are workspace scoped. Clearing a link is explicit null; no source/provenance overwrite.

## Candidate capability policy

| Capability | owner/admin | member (commercial) | viewer |
|---|---|---|---|
| Task/meeting/manual opportunity operations in authorized workspace | yes | yes | no |
| Work/calendar/stage reads | yes | yes | yes |
| Existing customer/contact mutations and PII editors | yes | no (B2 unchanged) | no |
| Fiscal/team/integration changes | not introduced here | no | no |

The attached product brief authorizes defining normal commercial work operations. There is no owner-only task restriction and no invented row ownership model: membership authorizes workspace operational records. Workspace/membership and target-assignee rows are locked while executing. Foreign, removed or suspended membership/workspace is denied. Raw tables and private helper functions remain closed; service_role and anonymous callers have no execute grant on these product RPCs.

## Reads

- `calendar(input)` → CalendarPageV1. range_start/range_end are offset-aware instants, half-open range, maximum 93 elapsed days. Optional kind/status/customer/assigned-user filters; limit 1–100, default 50. Cursor is the closed after_at/after_kind/after_id tuple, validated against fixed kinds. Stable ascending instant/kind/UUID order. It is a pagination position, never authority; every page is scoped and reauthorized.
- Meeting with end uses real overlap (start < range end AND end > range start). Null-end meeting is a point; tasks use due instant. Renewal/permanence dates remain `date`, with a separate ordering instant at Madrid midnight and all_day=true; never reinterpret a date-only deadline as a UTC date.
- `workGet(kind,id)` → closed task/meeting/opportunity editor, or not_found. No tax/contact/line identifier. Opportunity includes ≤3 links, latest 50 coded history rows and history_partial when older rows exist.
- `stageCatalog(limit,afterId)` → UUID-keyset page, maximum 100, default 50. Display order uses the returned position; page order uses stable UUID.

Input timestamps have seconds, optional 1–3 fractional digits and Z/explicit offset within ±14:00. Invalid Gregorian dates and missing offsets reject. Instants persist as timestamptz; display Europe/Madrid. Money is integer minor units <10^15, paired with EUR/USD/GBP. No float valuation or FX aggregation is introduced.

## Evidence / enablement

29 forward migrations, prior 27 immutable. Local PGlite fresh migration, existing domain/read/B2 suites, B3 replay/CAS/role/foreign/invalid-date/overlap/DST/bounds/rollback suites and extended 102-function privilege manifest pass. Node runtime tests cover closed input/output, each operation, hostile JSON, chronology and role boundary. Native runner is extended with fresh/restored B3 SQL and 20 independent creates/20 competing edits per task/meeting/opportunity; exact published CI results must be read before calling native execution passed.

TRANSPORT: server application seam only in this checkpoint. SUPABASE_EVIDENCE: new-family actual Auth/JWT/PostgREST acceptance pending. UI_SAFE_TO_ENABLE: **no**, awaiting HTTP integration and W4 review. This does not reduce W2's 64 blocked rows by assertion or change its frontend metrics. No assistant tools registered, frontend edits, provider sends, real data or production effects.
