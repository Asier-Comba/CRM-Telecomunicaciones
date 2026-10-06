# Service case v1

Candidate normal human product family: POST `/api/cases/v1`, same-origin authenticated cookies, no-store, `PRODUCT_V1_ENABLED` and `PRODUCT_V1_ORIGIN`. Current active membership and tenant resolve on the server for every operation, including exact replay. Raw cases and note tables remain closed. No AI write or provider integration.

| Operation | Commercial meaning |
|---|---|
| case.create | manual case with customer and optional immutable contract/service/line ancestry |
| case.update | active case type/title/priority/due date; full bounded replacement metadata |
| case.assign | active commercial assignee or null; explicit local metadata |
| case.change_status | move between open/in_progress/waiting_customer/waiting_operator |
| case.resolve | active -> resolved with coded resolution |
| case.reopen | resolved -> open, preserving original resolution receipt |
| case.close | resolved -> terminal closed |
| case.cancel | active -> terminal cancelled with coded cancellation |
| case.note_create | append private note with parent CAS and monotonic sequence |
| case.list/get | bounded safe commercial case summary |
| case.note_list | separately authorized private bounded note history |

Owner/admin/member can perform operational writes and private note reads. Viewer can list/get case summaries but cannot read note bodies or mutate. Closed/cancelled are terminal; no arbitrary lifecycle aliases. Resolve/reopen/close timestamps are server-generated, with no automatic line activation, provider success or provisioning. Resolution codes: issue_fixed/request_fulfilled/customer_confirmed/no_action_required. Cancellation codes: customer_withdrew/duplicate/no_longer_needed/entered_in_error. Prior exact receipts preserve coded resolution history after reopening.

Customer/contract/service/line ancestry is validated and locked. Links remain immutable after creation; metadata update does not relocate a case. A manual commercial incident may concern imported provider resources, since it does not rewrite their business facts. Imported/integration/system cases expose safe reads; only explicit local assignee and internal notes are editable. Provider-sourced status/type/title/due facts remain read-only. Legacy source is retained without certification.

`CaseInputsV1`, `CaseRowV1`, `CaseReceiptV1`, `CasePageV1`, `CaseGetV1`, `CaseNotePageV1` live in `src/lib/contracts/case-v1.ts`. Summary includes due_on/priority and overdue derived at statement time in Europe/Madrid, without stale stored SLA status. UUID ascending keysets limit1–100/default50; filters customer/contract/service/line/assignee/type/priority/status/source/overdue and paired due-date interval <=366days. No offset, raw identifier or arbitrary filter SQL.

All writes use exact command_id HMAC idempotency; edits require expected_version. Parent case CAS serializes note append, transition and resolution races. Private notes have <=4000characters, no unsupported control characters, immutable actor/timestamp and sequence. Notes cannot be edited/deleted. Reading notes uses case_id and after_seq, limit1–100; body never joins generic summaries, global search, audit, activities, notifications or durable receipts. No external delivery. Bodies may contain private human content and this read remains human-only; it is not an AI capability.

Fresh/restore SQL fixture individually exercises the family and private boundary. Six Node tests enforce inputs/DTO/privacy/current membership/same-origin transport. Native independent psql races exercise20create replays,20status CAS,20note CAS,20exact note replays and20resolution CAS, with one winner for distinct-key CAS. Real Supabase suite individually observes all12cookie operations, strict same-customer ancestry, viewer/private-note/direct-RPC denials, source preservation, bounded notes/pages and same valid JWT after suspension. These remain candidate checks until published exact-source acceptance passes.

Limits: no enterprise SLA engine, provider synchronization, outbound messages or case customer/context relink. Cases are commercial incidents; dedicated portability is a separate bounded workflow. Notes are private human material. W2 consumption remains unproven until demonstrated by W2.
