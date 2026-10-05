# W1 → W3 future AI capability handoff

Human backend contracts are candidates for a W3-owned adapter, not assistant registrations. Issue10 remains open. No assistant writes, live model calls, vectors or RAG are introduced. Server context must bind active user/workspace on every read; never accept caller actor/role/workspace, use raw tables, or inject service_role. Preserve safe errors, bounded pagination, partial/unavailable states, revocation and DTO runtime parsing.

## Existing minimized read families

| Domain | Exact normal capability | W3 boundary |
|---|---|---|
| Customers | telecom.v1 customer.search/get/summary; product.v1 customer.editor | Safe canonical identity/attention only; keep sensitive field capability masking |
| Contacts | product.v1 contact.editors | Authorized commercial/editor DTO includes protected contact methods; default AI context must omit them. Separate requested PII permission, not generic model context |
| Contracts/services/lines | telecom.v1 contract.list/get, service.list, line.list; portfolio.v1 portfolio.get | Safe provenance/version/display summaries; no MSISDN/SIM/circuit identifiers |
| Renewals/permanence | telecom.v1 renewal.list/permanence.list; portfolio.get(kind renewal/permanence) | Bounded canonical dates/status/source, no invented manual provenance |
| Tasks/meetings/opportunities | telecom.v1 lists; product.v1 work.get/calendar.list/opportunity.stages | Canonical IDs/statuses, bounded ranges; no automatic mutations or provider calendar sync |
| Activity | telecom.v1 activity.list | Closed summary codes only, no message/document bodies or raw audit tables |
| Dashboard/search | product.dashboard.v2 dashboard.get; product.v1 global.search | Role/scope and unavailable financial/team states preserved; native currencies kept separate |
| Billing | invoice.list/summary/financial_summary | Owner/admin only. invoice.get/configuration.get include fiscal material and must not enter generic AI context; a separately authorized minimized adapter is required |
| Documents | document.v1 list/get_metadata | Owner/admin metadata only. No file name/path/hash/ticket/content retrieval to AI |
| Private fiscal artifact | invoice.private_pdf_reference (billing.artifact.v1) | Owner/admin-only private UUID/status/renderer reference; never automatic PDF bytes, ticket or fiscal snapshot context |
| Imports | importjob.get/list (importjob.v1) | Owner/admin-only minimized status/count/checkpoint; processing explicitly blocked; no file/HMAC/staging/ciphertext ref or raw issue value |
| Inbox | Unavailable: internal domain draft is unpublished | Future separately authorized metadata summary; private body/provider event is excluded from generic model context |

## Nonmutating proposals

invoice.propose consumes a normalized manual/text/audio draft, validates the exact domain and returns requires_review=true/saved=false. It neither saves nor issues. W2 owns text/audio parsing; W3 may propose normalized fields only through the same role/input boundary. Search/navigation are bounded reads, not execution authorization. Message drafting remains unavailable.

## Human operation candidates

Every row below is FUTURE_AI_ACTION_CANDIDATE only. Confirmation must bind immutable intent, scope, version and command_id with durable cross-process execution/replay/recovery. W3 owns registration and Issue10 closure. Document content, upload/download tickets and invitation intents must not be exposed automatically.

| Human operation | Contract | Input type | Roles | Future status |
|---|---|---|---|---|
| task.create | product.v1 | ProductCommandInputsV1['task.create'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| task.update | product.v1 | ProductCommandInputsV1['task.update'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| task.start | product.v1 | ProductCommandInputsV1['task.start'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| task.complete | product.v1 | ProductCommandInputsV1['task.complete'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| task.reopen | product.v1 | ProductCommandInputsV1['task.reopen'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| task.cancel | product.v1 | ProductCommandInputsV1['task.cancel'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| meeting.create | product.v1 | ProductCommandInputsV1['meeting.create'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| meeting.update | product.v1 | ProductCommandInputsV1['meeting.update'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| meeting.reschedule | product.v1 | ProductCommandInputsV1['meeting.reschedule'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| meeting.complete | product.v1 | ProductCommandInputsV1['meeting.complete'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| meeting.cancel | product.v1 | ProductCommandInputsV1['meeting.cancel'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| meeting.no_show | product.v1 | ProductCommandInputsV1['meeting.no_show'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| opportunity.create | product.v1 | ProductCommandInputsV1['opportunity.create'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| opportunity.update | product.v1 | ProductCommandInputsV1['opportunity.update'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| opportunity.change_stage | product.v1 | ProductCommandInputsV1['opportunity.change_stage'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| opportunity.assign | product.v1 | ProductCommandInputsV1['opportunity.assign'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| opportunity.win | product.v1 | ProductCommandInputsV1['opportunity.win'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| opportunity.lose | product.v1 | ProductCommandInputsV1['opportunity.lose'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| opportunity.reopen | product.v1 | ProductCommandInputsV1['opportunity.reopen'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| opportunity.archive | product.v1 | ProductCommandInputsV1['opportunity.archive'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| customer.create | product.v1 | ProductCommandInputsV1['customer.create'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| customer.update | product.v1 | ProductCommandInputsV1['customer.update'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| customer.archive | product.v1 | ProductCommandInputsV1['customer.archive'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| customer.restore | product.v1 | ProductCommandInputsV1['customer.restore'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| contact.create | product.v1 | ProductCommandInputsV1['contact.create'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| contact.update | product.v1 | ProductCommandInputsV1['contact.update'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| contact.archive | product.v1 | ProductCommandInputsV1['contact.archive'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| contact.restore | product.v1 | ProductCommandInputsV1['contact.restore'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| issuer.set | billing.v1 | BillingInputsV1['issuer.set'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| customer_fiscal.set | billing.v1 | BillingInputsV1['customer_fiscal.set'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| invoice.create_draft | billing.v1 | BillingInputsV1['invoice.create_draft'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| invoice.update_draft | billing.v1 | BillingInputsV1['invoice.update_draft'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| invoice.issue | billing.v1 | BillingInputsV1['invoice.issue'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| invoice.mark_paid | billing.v1 | BillingInputsV1['invoice.mark_paid'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| invoice.reverse_payment | billing.v1 | BillingInputsV1['invoice.reverse_payment'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| invoice.trash | billing.v1 | BillingInputsV1['invoice.trash'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| invoice.restore | billing.v1 | BillingInputsV1['invoice.restore'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| member.invite_intent | team.v1 | TeamInputsV1['member.invite_intent'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| member.role_change | team.v1 | TeamInputsV1['member.role_change'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| member.suspend | team.v1 | TeamInputsV1['member.suspend'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| member.resume | team.v1 | TeamInputsV1['member.resume'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| member.remove | team.v1 | TeamInputsV1['member.remove'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| member.cancel_invite | team.v1 | TeamInputsV1['member.cancel_invite'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| contract.create_manual | portfolio.v1 | PortfolioInputsV1['contract.create_manual'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| contract.update_allowed_metadata | portfolio.v1 | PortfolioInputsV1['contract.update_allowed_metadata'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| contract.activate | portfolio.v1 | PortfolioInputsV1['contract.activate'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| contract.cancel | portfolio.v1 | PortfolioInputsV1['contract.cancel'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| service.create_manual | portfolio.v1 | PortfolioInputsV1['service.create_manual'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| service.update_label | portfolio.v1 | PortfolioInputsV1['service.update_label'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| service.transition | portfolio.v1 | PortfolioInputsV1['service.transition'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| line.create_manual | portfolio.v1 | PortfolioInputsV1['line.create_manual'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| line.update_label | portfolio.v1 | PortfolioInputsV1['line.update_label'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| line.transition | portfolio.v1 | PortfolioInputsV1['line.transition'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| contract.record_renewal | portfolio.v1 | PortfolioInputsV1['contract.record_renewal'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| renewal.update | portfolio.v1 | PortfolioInputsV1['renewal.update'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| renewal.resolve | portfolio.v1 | PortfolioInputsV1['renewal.resolve'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| renewal.dismiss | portfolio.v1 | PortfolioInputsV1['renewal.dismiss'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| permanence.create_manual | portfolio.v1 | PortfolioInputsV1['permanence.create_manual'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| permanence.update | portfolio.v1 | PortfolioInputsV1['permanence.update'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| permanence.cancel | portfolio.v1 | PortfolioInputsV1['permanence.cancel'] | owner, admin, member | FUTURE_AI_ACTION_CANDIDATE |
| document.archive | document.v1 | DocumentInputsV1['document.archive'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| document.restore | document.v1 | DocumentInputsV1['document.restore'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| document.request_upload | document.content.v1 | DocumentContentInputsV1['document.request_upload'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| document.finalize_upload | document.content.v1 | DocumentContentInputsV1['document.finalize_upload'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| document.request_download | document.content.v1 | DocumentContentInputsV1['document.request_download'] | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| invoice.persist_private_pdf | billing.artifact.v1 | BillingArtifactInputV1 | owner, admin | FUTURE_AI_ACTION_CANDIDATE |
| importjob.cancel | importjob.v1 | ImportJobCancelInputV1 | owner, admin | FUTURE_AI_ACTION_CANDIDATE |

## Evidence and availability

Accepted executable source f574b0c55951e6e357e4e91059fcfe64b1410b02: actual Supabase42/run37315671127 PASS801; native fresh/restored44 migrations/186 functions;212 Node/lint/types/build PASS, full audit Issue29 remains blocked. Catalog90 operations;90 have individual exact-source observations. C11 adds29 explicitly named positive/denied/replay/changed-intent/stale-CAS observations through normal SSR routes and actual Auth/JWT. Its exact expected operation set is asserted in the fixture and published in the safe report. A family PASS is never blanket operation proof.

Document content and private fiscal artifact are accepted default-off backend candidates: eff8022 real568 and78dd640 real609 respectively, carried forward by the632-check suite. W3 has no automatic binary-content capability. The private artifact reference is always verification_required:true; SQL association does not certify bytes. Normal fiscal download reauthorizes and verifies bytes against the regenerated frozen snapshot, but is not an AI-context permission. Native signedURL, antivirus and orphan cleanup are not implemented.

Import job get/list/cancel management has real individual evidence. Begin/validate/apply/resume is not registered and remains blocked by encrypted staging store/KMS/decrypt, quarantine ingest and closed domain adapters. W3 must preserve processing_status=blocked_encrypted_staging_adapter and never fabricate an import success or use a plaintext fallback.

User-facing document upload/finalize/download and fiscal/profile/team/import management are owner/admin only in this accepted source. Commercial owner/admin/member product commands have their explicit role matrices; a viewer is not authorized for protected editors/fiscal identities. The unimplemented requested-field sensitive-reveal capability must remain a gap, rather than extending generic DTOs.

Every future write remains Issue10-confirmation-required and NOT_REGISTERED. W3 must bind human intent, actor/workspace, all relevant entity versions, operation/input digest and command_id in durable cross-process execution/replay/recovery. Browser confirmation or chat prose alone is not authorization. Preserve canonical receipts, partial/pending states, safe errors, current membership revocation and per-effect idempotency. No provider secret/configuration, live LLM, message body, document body or raw import value is passed to a model by this handoff. UI_SAFE=false for every catalog row; W1 backend review readiness is separate from AI/release approval.
