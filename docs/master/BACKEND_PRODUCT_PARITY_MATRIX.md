# Backend product parity

Source: historical `iazticontact/crm-inmobiliario-demo@ad3c06e` (read only).
Parent: `w2/platform-closure-v1@a917bbb41ef8192344dc49737cd78fd52fe29649`.
Live reconstruction: 2026-10-03. All requested PRs and Issues 10/12/22 read.
Platform status files on the parent are stale; live PR reviews take precedence.

This is a capability inventory, not a claim of completed backend or full audit.
Implementation-level audit continues per module before porting behavior.

| Historical capability / source | Classification | Current backend / next contract |
|---|---|---|
| Dashboard periods, team, revenue (`dashboard-snapshot.ts`) | TELECOM ADAPTATION | telecom.v1 dashboard is bounded attention only; product.v1 metrics/periods missing; revenue unavailable until billing source |
| Company/client CRUD (`clients` pages) | IMPLEMENTED | product.v1 create/update/archive/restore/CAS editor; JWT owner/admin; transport review pending |
| Client detail/contact/attention (`clients/[id]`) | TELECOM ADAPTATION | customer.summary exists; separate customer/contact/task/meeting commands |
| Human contacts | IMPLEMENTED | product.v1 contact commands/primary/bounded PII editors; owner/admin; transport pending |
| Cartera/property | NOT APPLICABLE | no property/buyer/seller/rental schema port |
| Telecom portfolio | ALREADY EXISTS | contracts/services/lines/operators/plans/renewals/permanence reads; provenance-controlled commands missing |
| Operations/pipeline | TELECOM ADAPTATION | opportunities/stages exist; controlled stage transition/history/CAS missing |
| Tasks | BACKEND MISSING | task.list exists; user-driven create/update/complete/reopen/cancel missing |
| Calendar week/month/agenda (`calendar` page) | TELECOM ADAPTATION | meeting.list exists; bounded overlap query and commands missing |
| Google calendar OAuth/sync API | PLATFORM-OWNED | external provider execution deferred; no calendar-token port |
| Assistant read/proposals (`agents`) | AI-OWNED BY W3 | telecom.v1 unchanged; product reads can extend separately |
| Assistant mutations | SECURITY BLOCKED | Issue10; no assistant routes or writes enabled |
| Invoice drafts/editor/lines (`invoicing/invoice-repo.ts`) | GENERIC — PORT | no current billing schema; billing.v1 relational drafts needed |
| Discounts/IVA/withholding/currency (`invoicing/calc.ts`) | GENERIC — PORT | exact decimal/minor units; replace float arithmetic |
| Issue/number/series (`invoice-service.ts`) | GENERIC — PORT | transaction-safe issue+snapshot+sequence, no standalone browser number reservation |
| Issuer/customer snapshots | GENERIC — PORT | immutable issued identity, preserve generic behavior |
| Paid/overdue/trash/restore/summary (`billing-state.ts`, `invoice-summary.ts`) | GENERIC — PORT | issued truth protected; trash drafts; overdue derived; bounded periods |
| Invoice PDF (`invoice-pdf.ts`, `entity-files.ts`) | GENERIC — PORT | server PDF job/object reference; no arbitrary logo URL fetching |
| Invoice text/audio (`invoice-parse.ts`) | TELECOM ADAPTATION | deterministic reviewable proposal only; AI W3; explicit save/issue |
| Real estate honorarios (`honorarios.ts`) | NOT APPLICABLE | no mechanical commission/property port |
| Workspace settings (`workspace-settings.ts`) | TELECOM ADAPTATION | company/issuer profile separate from user profile, role-restricted edits |
| Documents (`entity-files.ts`) | BACKEND MISSING | private metadata/Storage foundation exists; opaque authorization/list/archive seam missing |
| Inbox list/detail/assignment/messages (`api/inbox`) | GENERIC — PORT | provider-neutral model needed; no external send |
| WhatsApp inbound/agent | SECURITY BLOCKED | do not port shared authority or unregistered external calls |
| Automations/n8n (`automations`, `n8n-client.ts`) | PLATFORM-OWNED | registered event/integration IDs only; arbitrary browser webhook rejected |
| Reports (`api/reports`) | TELECOM ADAPTATION | bounded typed portfolio/pipeline/billing queries; no SELECT * report copy |
| Global search | BACKEND MISSING | customer.search only; typed ranked union missing |
| Team/invites (`api/team`) | PLATFORM-OWNED | canonical memberships/Auth separate; never use historical profiles.role |
| Onboarding | ALREADY EXISTS | atomic provision_workspace with membership/workspace revocation |
| Notifications | BACKEND MISSING | audit actual historical behavior before optional internal model |
| Imports | BACKEND MISSING | lifecycle/lineage foundation exists; executable same-key create/resume adapter missing |
| Activity | ALREADY EXISTS | append-only coded activity; new command codes/history needed |
| Visual charts/calendar/layout | FRONTEND ONLY | W2 owns; W1 edits no visual components |

## W2 initial handoff

| Contract | State | UI safe to enable |
|---|---|---|
| CUSTOMER_CREATE / CONTACT_CREATE | implemented product.v1 authenticated JWT RPC + closed application service | no |
| CUSTOMER_UPDATE / ARCHIVE / RESTORE | implemented expected_version + command_id | no |
| TASK_MUTATE / MEETING_MUTATE | planned canonical lifecycle + CAS | no |
| CALENDAR_QUERY | planned bounded instant overlap range, stable pagination | no |
| OPPORTUNITY_MUTATE | planned canonical stage ID and explicit transition | no |
| DASHBOARD_METRICS | planned product.v1, v1 remains compatible | no |
| BILLING | missing billing.v1; no invented revenue | no |

No fake empties/zeroes, no frontend implementation, no assistant mutation enablement,
no production, no real data. PR24/25/26 remain unmerged candidates; review separately.
Percentages are not computed until the inventory denominator and behavioral tests exist.
