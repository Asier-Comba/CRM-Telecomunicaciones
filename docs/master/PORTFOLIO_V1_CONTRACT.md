# Human portfolio.v1 contract

This is the normal CRM application boundary. It is not registered with the assistant and has no operator/provider side effects. Existing telecom.v1 reads remain compatible. New HTTP routes are default off behind PRODUCT_V1_ENABLED and the exact server PRODUCT_V1_ORIGIN; cookies/getUser and active server-selected membership determine actor/workspace. SQL holds membership/workspace authorization through commit, including replay.

Active owner/admin/member may write; active viewer may consume safe editors. Raw portfolio tables and private helpers remain closed to anon/authenticated/service_role. Every write carries a UUID command_id, retained unchanged on retries. All edits carry expected_version from the editor. Same input replays its receipt; changed input or stale versions conflict. Labels and contact/line identifiers never enter audit receipts. Coded activities and the private audit commit atomically with the entity and command ledger.

| Operation | Closed input beyond command_id | Behavior |
|---|---|---|
| contract.create_manual | customer_id, operator_id, start_date; optional plan_version_id/assigned_user_id | Active scoped customer/operator; draft, source manual; immutable plan revision validates operator/date |
| contract.update_allowed_metadata | id, expected_version, assigned_user_id (UUID or null) | Local assignment only; active same-workspace member; preserves origin/facts |
| contract.activate | id, expected_version, signed_date | Manual draft → active; signed fact recorded once |
| contract.cancel | id, expected_version | Manual draft/active → cancelled, actor/time recorded; all services must already be ended/cancelled |
| service.create_manual | contract_id, service_kind, display_name; optional plan_version_id | Manual draft/active contract only; inherits customer/operator/provenance, starts pending |
| service.update_label | id, expected_version, display_name | Human display label for any provenance |
| service.transition | id, expected_version, status, effective_on | Manual pending→active/cancelled, active→suspended/ended, suspended→active/ended; no terminal reopen; live lines block terminal closure |
| line.create_manual | service_id, display_name | Manual live ancestry only; starts pending; no MSISDN/SIM/ICCID/circuit identifier fields |
| line.update_label | id, expected_version, display_name | Human display label for any provenance |
| line.transition | id, expected_version, status, effective_on | Same manual graph as service; activation requires active contract/service |
| portfolio.get | kind (contract/service/line), id | Closed safe editor with version/provenance; scoped absence → not_found; no sensitive identifier/profile payload |

Types: src/lib/contracts/portfolio-v1.ts. Service: PortfolioServiceV1 with a USER-JWT ProductUserPortV1. Transport: POST /api/portfolio/v1/commands and /api/portfolio/v1/queries, JSON {operation,input}. Shared transport enforces Host/Origin, byte bounds, exact operation whitelist and normalized safe errors. Private helpers are not callable by user JWTs or service_role.

Services/lines inherit source at insert and existing rows are backfilled from their parent. Immutable identities include workspace, ancestry, customer, operator, plan revision, service kind, source, creator and contract start/end facts. Imported/integration facts cannot be manually created beneath, activated, cancelled or transitioned. Assignment/labels are explicit local annotations and never change provenance.

Ancestor-first row locks serialize contract/service/line operations. Parent closure and child creation cannot both commit. Activation and terminal dates are validated against canonical facts; status_effective_on prevents later commands from backdating a prior status transition. Existing lifecycle history is not rewritten by generic metadata input. Terminal rows may receive a local label/assignment annotation but cannot reopen.

Validation: closed fields, UUIDs, safe positive versions, date-only 1900–2199 calendar dates, bounded control-free labels and canonical kinds/statuses. Command receipts verify version, operation/key/id/status/provenance. Native minor-unit billing, fiscal snapshots, protected identifiers and import/provider truth are separate domains.

Candidate evidence: local 192 Node tests,37-migration embedded PostgreSQL fresh/restored privilege matrix150functions and SQL provenance/CAS/replay/suspension/audit rollback fixture. Added native independent20-process create/CAS checks per family and parent closure/child creation races; added actual Auth/PostgREST20-request families, valid-JWT revocation and real Next SSR-cookie editor/write acceptance. These native/actual-platform additions remain pending exact published-head CI until separately recorded. UI-safe remains false pending W4/W2 review.

Remaining B4: renewal/permanence record/update/resolve/dismiss/supersede and additional lifecycle history/read density. No archive alias disguises contractual cancellation. B8 document workflow/imports and B9 inbox/automations remain open; team has a separate concurrent candidate. No full behavioral parity percentage is claimed.

## Renewal/permanence extension

Seven additional manual commands extend the same routes, types, authentication, receipt, private audit and CAS/replay boundary:

| Operation | Closed input beyond command_id | Behavior |
|---|---|---|
| contract.record_renewal | contract_id, target_on, opens_on, closes_on | Manual live contract only; opens/closes both null or ordered containing target; unique target and exclusion constraint prevent overlapping windows |
| renewal.update | id, expected_version, target_on, opens_on, closes_on | Manual open record only; full bounded date replacement; closed/imported facts cannot be rewritten |
| renewal.resolve | id, expected_version, reason_code | Open→completed; completion timestamp from server |
| renewal.dismiss | id, expected_version, reason_code | Open→dismissed; dismissal timestamp from server |
| permanence.create_manual | contract_id, commitment_kind, starts_on, ends_on, reason_code; optional service_id | Manual live contract; optional same-contract live manual service; ordered term at/after contract start |
| permanence.update | id, expected_version, starts_on, ends_on, reason_code | Manual open administrative record only; identity/kind/link/source immutable |
| permanence.cancel | id, expected_version, reason_code | Open→cancelled; server actor/time and closed coded reason |

portfolio.get accepts renewal/permanence kinds and returns their authoritative versions, provenance, dates and closed reason codes. Existing product calendar DTO keeps its legacy null version for those kinds; obtain portfolio.get before editing. A contractual cancellation does not silently resolve or cancel deadlines; open manual deadlines may be explicitly resolved/dismissed/cancelled after parent closure. Date editing/new recording requires a live parent. Imported/integration deadlines are read-only. Supersede is unavailable; no invented alias erases historical facts.

Forward migration1930 privately wraps the existing portfolio editor, preserves old fields/ACLs and extends coded creation activities to .create_manual and contract.record_renewal. Other product operations retain their existing activity classification. Private base editor is explicitly revoked and included in the privilege manifest. Candidate38migrations/161functions; new native/Supabase family races and revocation checks are pending exact published head. Previous core497a558: native CI296/37222106155 PASS; Supabase run17/37222106102 PASS457checks, browser boundary/teardown PASS; quality192tests/lint/types/build PASS then Issue29 audit FAIL.

## Explicit child provenance correction

Forward migration2045 preserves an explicit import/integration source on service/line inserts even beneath a manual parent. Omitted/manual source still inherits its parent. Existing overwritten provenance cannot be inferred and is not guessed. Identity remains immutable; imported/integration children may receive local labels but cannot transition or gain new manual descendants. Corrected fixture and actual USER-JWT regressions verify explicit imported services, integrated lines and default inherited lines. Exactb5955fb1bb540036802b57e2e0644be221c8801c native CI30241migrations168functions and Supabase23/37224799063 PASS522checks/browser/teardown; no new local executor validation after disconnection.
