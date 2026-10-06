# Commercial portability v1

Candidate family: seven normal human operations through POST `/api/portability/v1`, gated by `PRODUCT_V1_ENABLED=true` and `PRODUCT_V1_ORIGIN`. Current authenticated cookies resolve tenant and active membership server-side. Owner/admin/member write; viewer reads. No AI writes or carrier API integration.

`src/lib/contracts/portability-v1.ts` defines exact inputs, receipts, masked records and pages. Caller tenant, actor, arbitrary state, raw number search and unregistered reason codes are rejected. Raw domain table access remains denied. `portability.list` uses ascending UUID keysets, limit1–100 (default50), ancestry/owner/operator/status/source/direction and paired requested-date window <=366days. `portability.get` returns one safe record; tenant-mismatched IDs return not_found.

| Operation | State requirements | Behavior |
|---|---|---|
| portability.create | no other open workflow on line | manual parent ancestry; active protected MSISDN; creates draft |
| portability.update_draft | draft | donor/target/requested date metadata CAS; identity remains frozen |
| portability.assign | nonterminal | active commercial assignee or null; local assignment may apply to imported facts |
| portability.transition | closed edges below | explicit effective date and manual evidence source; coded rejection/cancellation |
| portability.complete | scheduled/in_progress | manual confirmed provider outcome; optional explicit atomic line effect |
| portability.list/get | active read membership | masked MSISDN plus safe dates/status/references |

Draft -> requested/cancelled; requested -> scheduled/rejected/cancelled; scheduled -> in_progress/rejected/cancelled; in_progress -> rejected/cancelled. Completion is a distinct command from scheduled/in_progress. Terminal rows cannot be reopened; another workflow preserves prior history. Rejections: subscriber_mismatch, number_not_found, authorization_missing, ineligible_contract, donor_rejected, technical_failure. Cancellation: customer_withdrew, duplicate_request. Phase dates are ordered; no generic lifecycle alias.

The line's current operator is target for inbound and donor for outbound. This distributor workflow does not rewrite provider network truth. `number_identifier_id` refers to the normalized protected MSISDN; no copied number. List/get return deterministic last3 mask only. Existing human `sensitive.get` requested-field reveal remains separate, authorized and value-free audited. No PIN/PUK or provider credentials.

All writes require command_id and exact HMAC receipt recovery. Updates use expected_version. Ancestors lock in contract -> service -> line -> portability order. One partial unique open-workflow index enforces concurrent assignment. Completion additionally requires evidence_source='manual', provider_outcome='confirmed_completed', line_action='none'/'activate'/'end', and expected_line_version when an action is requested. Inbound may activate; outbound may end; none leaves the line unchanged. Existing canonical portfolio transition executes atomically and audits the explicit effect. A stale line CAS rolls back completion, audit and receipts. No hidden provisioning trigger and no guessed provider success.

Imported/integration business facts remain read-only, except explicit local assignee metadata. No delete. Identity and ancestry guards preserve tenant/customer/contract/service/line alignment. New-create operator activity and assignee membership are locked and checked. Historical masks and immutable MSISDN associations persist through cancellation/rejection/completion. Raw identifiers and reason text never enter audit, activity or generic search.

Acceptance sources: `supabase/tests/commercial-portability-workflow.sql` runs fresh/restore fixtures; six Node tests enforce boundaries and closed DTOs; native independent-process races exercise open assignment, CAS transitions and exact create/completion replay. `scripts/security/supabase-local/commercial-portability-acceptance.mjs` individually observes all seven via real cookies, including explicit inbound activation/outbound ending, history pagination, viewer/foreign denials and same valid JWT after membership suspension. These are planned acceptance checks until the published source passes; local PGlite is not Auth/HTTP proof.

Limitations: provider outcomes are recorded by humans; no carrier truth verification. Fixed-number porting, bulk porting, provider imports and integration transition paths are absent. An active protected MSISDN must be assigned first. Case linkage, SIM/eSIM, attention aggregation and embedded line summary will be subsequent domains. Optional service add-on assignment history remains absent.
