# W1 → W3 future AI handoff

Human backend contracts are not assistant registrations. Issue10 remains open and W3 owns it. All 91 writes below require a future durable confirmation protocol binding immutable normalized intent, trusted workspace and actor, exact operation, command_id, expected_version where applicable, expiry and single-use authorization. Persist confirmation, dispatch and receipt across process restarts; recover uncertain delivery through the same HMAC replay key, never a new command_id. Reauthorize current membership/role and entity access immediately before execution and before returning a replay. A changed payload conflicts; a revoked identity cannot recover a privileged receipt. No write dispatcher, provider call, live AI or deployment is authorized here.

Generic AI context excludes sensitive.get/reveal audit, contact methods, fiscal IDs/profiles/issuer snapshots, Inbox bodies, document/PDF bytes and names/paths/tickets/hashes, import plaintext/ciphertext/key references, private logos, invitations and raw audit rows. Existing editor DTOs may contain protected fields; do not treat their existing human authorization as generic model permission. Inbox metadata and automation definitions need a separately reviewed minimized adapter. New manual-origin proof applies only to new canonical creates; legacy source=manual remains unverified.

## Human write contracts (91)

| Operation | Contract | RPC | Input type | Roles | CAS | Future boundary |
|---|---|---|---|---|---|---|
| task.create | product.v1 | product_v1_task_create | ProductCommandInputsV1['task.create'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| task.update | product.v1 | product_v1_task_update | ProductCommandInputsV1['task.update'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| task.start | product.v1 | product_v1_task_start | ProductCommandInputsV1['task.start'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| task.complete | product.v1 | product_v1_task_complete | ProductCommandInputsV1['task.complete'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| task.reopen | product.v1 | product_v1_task_reopen | ProductCommandInputsV1['task.reopen'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| task.cancel | product.v1 | product_v1_task_cancel | ProductCommandInputsV1['task.cancel'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| meeting.create | product.v1 | product_v1_meeting_create | ProductCommandInputsV1['meeting.create'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| meeting.update | product.v1 | product_v1_meeting_update | ProductCommandInputsV1['meeting.update'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| meeting.reschedule | product.v1 | product_v1_meeting_reschedule | ProductCommandInputsV1['meeting.reschedule'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| meeting.complete | product.v1 | product_v1_meeting_complete | ProductCommandInputsV1['meeting.complete'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| meeting.cancel | product.v1 | product_v1_meeting_cancel | ProductCommandInputsV1['meeting.cancel'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| meeting.no_show | product.v1 | product_v1_meeting_no_show | ProductCommandInputsV1['meeting.no_show'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| opportunity.create | product.v1 | product_v1_opportunity_create | ProductCommandInputsV1['opportunity.create'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| opportunity.update | product.v1 | product_v1_opportunity_update | ProductCommandInputsV1['opportunity.update'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| opportunity.change_stage | product.v1 | product_v1_opportunity_change_stage | ProductCommandInputsV1['opportunity.change_stage'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| opportunity.assign | product.v1 | product_v1_opportunity_assign | ProductCommandInputsV1['opportunity.assign'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| opportunity.win | product.v1 | product_v1_opportunity_win | ProductCommandInputsV1['opportunity.win'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| opportunity.lose | product.v1 | product_v1_opportunity_lose | ProductCommandInputsV1['opportunity.lose'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| opportunity.reopen | product.v1 | product_v1_opportunity_reopen | ProductCommandInputsV1['opportunity.reopen'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| opportunity.archive | product.v1 | product_v1_opportunity_archive | ProductCommandInputsV1['opportunity.archive'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| customer.create | product.v1 | product_v1_customer_create | ProductCommandInputsV1['customer.create'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| customer.update | product.v1 | product_v1_customer_update | ProductCommandInputsV1['customer.update'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| customer.archive | product.v1 | product_v1_customer_archive | ProductCommandInputsV1['customer.archive'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| customer.restore | product.v1 | product_v1_customer_restore | ProductCommandInputsV1['customer.restore'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| contact.create | product.v1 | product_v1_contact_create | ProductCommandInputsV1['contact.create'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| contact.update | product.v1 | product_v1_contact_update | ProductCommandInputsV1['contact.update'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| contact.archive | product.v1 | product_v1_contact_archive | ProductCommandInputsV1['contact.archive'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| contact.restore | product.v1 | product_v1_contact_restore | ProductCommandInputsV1['contact.restore'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| issuer.set | billing.v1 | billing_v1_issuer_set | BillingInputsV1['issuer.set'] | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| customer_fiscal.set | billing.v1 | billing_v1_customer_fiscal_set | BillingInputsV1['customer_fiscal.set'] | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| invoice.create_draft | billing.v1 | billing_v1_invoice_create_draft | BillingInputsV1['invoice.create_draft'] | owner, admin | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| invoice.update_draft | billing.v1 | billing_v1_invoice_update_draft | BillingInputsV1['invoice.update_draft'] | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| invoice.issue | billing.v1 | billing_v1_invoice_issue | BillingInputsV1['invoice.issue'] | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| invoice.mark_paid | billing.v1 | billing_v1_invoice_mark_paid | BillingInputsV1['invoice.mark_paid'] | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| invoice.reverse_payment | billing.v1 | billing_v1_invoice_reverse_payment | BillingInputsV1['invoice.reverse_payment'] | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| invoice.trash | billing.v1 | billing_v1_invoice_trash | BillingInputsV1['invoice.trash'] | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| invoice.restore | billing.v1 | billing_v1_invoice_restore | BillingInputsV1['invoice.restore'] | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| member.invite_intent | team.v1 | team_v1_member_invite_intent | TeamInputsV1['member.invite_intent'] | owner, admin | No; canonical create/event semantics | Future only; explicit privacy/execution gate + Issue10 |
| member.role_change | team.v1 | team_v1_member_role_change | TeamInputsV1['member.role_change'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| member.suspend | team.v1 | team_v1_member_suspend | TeamInputsV1['member.suspend'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| member.resume | team.v1 | team_v1_member_resume | TeamInputsV1['member.resume'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| member.remove | team.v1 | team_v1_member_remove | TeamInputsV1['member.remove'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| member.cancel_invite | team.v1 | team_v1_member_cancel_invite | TeamInputsV1['member.cancel_invite'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| contract.create_manual | portfolio.v1 | portfolio_v1_contract_create_manual | PortfolioInputsV1['contract.create_manual'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| contract.update_allowed_metadata | portfolio.v1 | portfolio_v1_contract_update_allowed_metadata | PortfolioInputsV1['contract.update_allowed_metadata'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| contract.activate | portfolio.v1 | portfolio_v1_contract_activate | PortfolioInputsV1['contract.activate'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| contract.cancel | portfolio.v1 | portfolio_v1_contract_cancel | PortfolioInputsV1['contract.cancel'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| service.create_manual | portfolio.v1 | portfolio_v1_service_create_manual | PortfolioInputsV1['service.create_manual'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| service.update_label | portfolio.v1 | portfolio_v1_service_update_label | PortfolioInputsV1['service.update_label'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| service.transition | portfolio.v1 | portfolio_v1_service_transition | PortfolioInputsV1['service.transition'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| line.create_manual | portfolio.v1 | portfolio_v1_line_create_manual | PortfolioInputsV1['line.create_manual'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| line.update_label | portfolio.v1 | portfolio_v1_line_update_label | PortfolioInputsV1['line.update_label'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| line.transition | portfolio.v1 | portfolio_v1_line_transition | PortfolioInputsV1['line.transition'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| contract.record_renewal | portfolio.v1 | portfolio_v1_contract_record_renewal | PortfolioInputsV1['contract.record_renewal'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| renewal.update | portfolio.v1 | portfolio_v1_renewal_update | PortfolioInputsV1['renewal.update'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| renewal.resolve | portfolio.v1 | portfolio_v1_renewal_resolve | PortfolioInputsV1['renewal.resolve'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| renewal.dismiss | portfolio.v1 | portfolio_v1_renewal_dismiss | PortfolioInputsV1['renewal.dismiss'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| permanence.create_manual | portfolio.v1 | portfolio_v1_permanence_create_manual | PortfolioInputsV1['permanence.create_manual'] | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| permanence.update | portfolio.v1 | portfolio_v1_permanence_update | PortfolioInputsV1['permanence.update'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| permanence.cancel | portfolio.v1 | portfolio_v1_permanence_cancel | PortfolioInputsV1['permanence.cancel'] | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| document.archive | document.v1 | document_v1_archive | DocumentInputsV1['document.archive'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| document.restore | document.v1 | document_v1_restore | DocumentInputsV1['document.restore'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| document.request_upload | document.content.v1 | document_content_v1_request_upload | DocumentContentInputsV1['document.request_upload'] | owner, admin | No; canonical create/event semantics | Future only; explicit privacy/execution gate + Issue10 |
| document.finalize_upload | document.content.v1 | document_content_v1_finalize_upload | DocumentContentInputsV1['document.finalize_upload'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| document.request_download | document.content.v1 | document_content_v1_request_download | DocumentContentInputsV1['document.request_download'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| invoice.persist_private_pdf | billing.artifact.v1 | billing_artifact_v1_attach | BillingArtifactInputV1 | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| importjob.cancel | importjob.v1 | importjob_v1_cancel | ImportJobCancelInputV1 | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| conversation.create_internal | inbox.v1 | inbox_v1_conversation_create_internal | InboxInputV1 | owner, admin, member | No; canonical create/event semantics | Future only; durable Issue10 confirmation |
| message.add_internal_note | inbox.v1 | inbox_v1_message_add_internal_note | InboxInputV1 | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| conversation.assign | inbox.v1 | inbox_v1_conversation_assign | InboxInputV1 | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| conversation.link_customer | inbox.v1 | inbox_v1_conversation_link_customer | InboxInputV1 | owner, admin | expected_version | Future only; durable Issue10 confirmation |
| conversation.close | inbox.v1 | inbox_v1_conversation_close | InboxInputV1 | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| conversation.reopen | inbox.v1 | inbox_v1_conversation_reopen | InboxInputV1 | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| conversation.archive | inbox.v1 | inbox_v1_conversation_archive | InboxInputV1 | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| conversation.restore | inbox.v1 | inbox_v1_conversation_restore | InboxInputV1 | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| conversation.mark_read | inbox.v1 | inbox_v1_conversation_mark_read | InboxInputV1 | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| conversation.mark_unread | inbox.v1 | inbox_v1_conversation_mark_unread | InboxInputV1 | owner, admin, member | expected_version | Future only; durable Issue10 confirmation |
| notification.refresh | notifications.v1 | notification_v1_refresh | NotificationInputV1 | owner, admin, member | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| notification.mark_read | notifications.v1 | notification_v1_mark_read | NotificationInputV1 | owner, admin, member | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| notification.mark_all_read | notifications.v1 | notification_v1_mark_all_read | NotificationInputV1 | owner, admin, member | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| automation.create | automations.v1 | automation_v1_create | AutomationInputV1 | owner, admin | No; canonical create/event semantics | Future only; explicit privacy/execution gate + Issue10 |
| automation.update | automations.v1 | automation_v1_update | AutomationInputV1 | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| automation.enable | automations.v1 | automation_v1_enable | AutomationInputV1 | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| automation.disable | automations.v1 | automation_v1_disable | AutomationInputV1 | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| automation.process_pending | automations.v1 | automation_v1_process_pending | AutomationInputV1 | owner, admin | No; canonical create/event semantics | Future only; explicit privacy/execution gate + Issue10 |
| settings.profile_update | settings.v1 | settings_v1_profile_update | SettingsInputV1 | owner, admin, member, viewer | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| settings.company_update | settings.v1 | settings_v1_company_update | SettingsInputV1 | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| member.reissue_invite | team.v1 | team_v1_member_reissue_invite | TeamInputsV1['member.reissue_invite'] | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| document.verify_content | document.integrity.v1 | document_integrity_v1_verify | DocumentMaintenanceInputV1 | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| document.cleanup_claim | document.cleanup.v1 | document_cleanup_v1_claim | DocumentMaintenanceInputV1 | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |
| document.cleanup_finish | document.cleanup.v1 | document_cleanup_v1_finish | DocumentMaintenanceInputV1 | owner, admin | expected_version | Future only; explicit privacy/execution gate + Issue10 |

## Human read contracts (38)

Every read still needs a W3-owned minimized adapter and current server-authoritative identity. Table presence is not registration or privacy approval. Preserve bounded pagination, role-specific unavailable states, revocation, native currencies and closed DTO parsing.

| Operation | Contract | RPC | Input type | Roles | Output |
|---|---|---|---|---|---|
| customer.editor | product.v1 | product_v1_customer_editor | {id:UUID} | owner, admin, member | CustomerEditorV1 |
| contact.editors | product.v1 | product_v1_contact_editors | {customer_id:UUID,limit?:number,after_id?:UUID|null} | owner, admin, member | ContactEditorPageV1 |
| calendar.list | product.v1 | product_v1_calendar | CalendarInputV1 | owner, admin, member, viewer | CalendarPageV1 |
| work.get | product.v1 | product_v1_work_get | {kind:'task'|'meeting'|'opportunity',id:UUID} | owner, admin, member, viewer | WorkGetV1 |
| opportunity.stages | product.v1 | product_v1_stage_catalog | {limit?:number,after_id?:UUID|null} | owner, admin, member, viewer | StageCatalogV1 |
| dashboard.get | product.dashboard.v2 | product_v1_dashboard_v2 | DashboardInputV2 | owner, admin, member, viewer | DashboardV2 |
| global.search | product.v1 | product_v1_global_search | GlobalSearchInputV1 | owner, admin, member, viewer | GlobalSearchV1 |
| invoice.get | billing.v1 | billing_v1_invoice_get | BillingQueriesV1['invoice.get'] | owner, admin | BillingReadDataV1 |
| invoice.summary | billing.v1 | billing_v1_invoice_summary | BillingQueriesV1['invoice.summary'] | owner, admin | BillingReadDataV1 |
| invoice.list | billing.v1 | billing_v1_invoice_list | BillingQueriesV1['invoice.list'] | owner, admin | BillingReadDataV1 |
| invoice.financial_summary | billing.v1 | billing_v1_invoice_financial_summary | BillingQueriesV1['invoice.financial_summary'] | owner, admin | BillingReadDataV1 |
| configuration.get | billing.v1 | billing_v1_configuration_get | BillingQueriesV1['configuration.get'] | owner, admin | BillingReadDataV1 |
| invoice.pdf | billing.v1 | billing_v1_invoice_get | BillingQueriesV1['invoice.get'] | owner, admin | application/pdf authoritative snapshot |
| invoice.propose | billing.v1 | billing_v1_invoice_propose | BillingQueriesV1['invoice.propose'] | owner, admin | BillingReadDataV1 |
| member.list | team.v1 | team_v1_member_list | TeamListInputV1 | owner, admin | TeamListV1 |
| portfolio.get | portfolio.v1 | portfolio_v1_get | PortfolioGetInputV1 | owner, admin, member, viewer | PortfolioGetV1 |
| document.list | document.v1 | document_v1_list | DocumentListInputV1 | owner, admin | DocumentListV1 |
| document.get_metadata | document.v1 | document_v1_get_metadata | DocumentGetInputV1 | owner, admin | DocumentGetV1 |
| document.download | document.content.v1 | document_content_v1_manifest | DocumentDownloadInputV1 | owner, admin | authorized_attachment_bytes |
| invoice.private_pdf_reference | billing.artifact.v1 | billing_artifact_v1_get | {id:uuid} | owner, admin | BillingArtifactReferenceV1 |
| invoice.private_pdf | billing.artifact.v1 | billing_artifact_v1_get | {id:uuid} | owner, admin | verified_frozen_private_pdf_bytes |
| importjob.get | importjob.v1 | importjob_v1_get | {id:uuid} | owner, admin | ImportJobRecordV1 |
| importjob.list | importjob.v1 | importjob_v1_list | ImportJobListInputV1 | owner, admin | bounded_importjob_records |
| inbox.list | inbox.v1 | inbox_v1_list | InboxReadInputV1 | owner, admin, member | bounded_inbox_DTO |
| inbox.get_thread | inbox.v1 | inbox_v1_get_thread | InboxReadInputV1 | owner, admin, member | bounded_inbox_DTO |
| inbox.unread_summary | inbox.v1 | inbox_v1_unread_summary | InboxReadInputV1 | owner, admin, member | bounded_inbox_DTO |
| notification.list | notifications.v1 | notification_v1_list | NotificationListInputV1 | owner, admin, member | bounded_notification_DTO |
| notification.unread_count | notifications.v1 | notification_v1_unread_count | NotificationListInputV1 | owner, admin, member | bounded_notification_DTO |
| automation.list | automations.v1 | automation_v1_list | AutomationReadInputV1 | owner, admin | bounded_automation_DTO |
| automation.get | automations.v1 | automation_v1_get | AutomationReadInputV1 | owner, admin | bounded_automation_DTO |
| automation.run_history | automations.v1 | automation_v1_run_history | AutomationReadInputV1 | owner, admin | bounded_automation_DTO |
| settings.profile_get | settings.v1 | settings_v1_profile_get | empty_input | owner, admin, member, viewer | closed_settings_DTO |
| settings.company_get | settings.v1 | settings_v1_company_get | empty_input | owner, admin, member, viewer | closed_settings_DTO |
| settings.integrations | settings.v1 | settings_v1_integrations | empty_input | owner, admin, member, viewer | closed_settings_DTO |
| sensitive.get | sensitive.v1 | sensitive_v1_get | SensitiveInputV1 | owner, admin, member | SensitiveResultV1 |
| member.invite_list | team.v1 | team_v1_member_invite_list | TeamListInputV1 | owner, admin | TeamInviteListV1 |
| provenance.get | provenance.v1 | provenance_v1_get | ProvenanceInputV1 | owner, admin | ProvenanceResultV1 |
| document.expired_list | document.cleanup.v1 | document_cleanup_v1_expired_list | TeamListInputV1 | owner, admin | bounded_expired_metadata |

invoice.propose is a nonmutating normalized proposal: requires_review=true, saved=false. W2 owns text/audio parsing; no arbitrary prompt-to-write bridge. Registered automation effects are only the internal task.create/notification.create paths triggered by actual future canonical events; no arbitrary URL/code/SQL and no assistant dispatcher. Future n8n/inbound interfaces remain unregistered. Normal import validation/apply/resume remains unavailable until production encrypted staging, scoped worker and canonical import-source adapters exist.

Machine authority: [product-capabilities.json](contracts/product-capabilities.json). Every ui_safe remains false pending W2/W4 review. Source/run acceptance is recorded in [the current closure](W1_PRODUCT_CLOSURE_20261005.md); prior figures are historical.
