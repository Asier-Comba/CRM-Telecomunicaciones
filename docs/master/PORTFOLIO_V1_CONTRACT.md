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
