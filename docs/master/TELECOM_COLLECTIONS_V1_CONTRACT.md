# Ordinary telecom commercial collections v1 — candidate

POST `/api/product/v1/queries` with `{operation,input}`, normal SSR cookie/Auth JWT, active server-selected workspace, exact `PRODUCT_V1_ORIGIN`/Host and default-off `PRODUCT_V1_ENABLED`. The normal reader roles are owner/admin/member/viewer. No raw table grants, assistant dispatcher or privileged execution port. `ui_safe:false`; W2/W4 own UI acceptance.

Every list uses immutable UUID ascending keyset order (`sort:id_asc`, the only admitted sort), `limit:1..100` (default50) and `after_id`. Response `{contract_version:telecom.collections.v1,operation,items,next_id}`. Cursor rows and filters are server scoped; no offset. With a stable matching dataset traversal returns every row exactly once. Changing filter membership during traversal does not create a historical snapshot; concurrent inserts behind the cursor are visible on a fresh traversal. `.get` input is exactly `{id}`, response adds `record` instead of `items/next_id`, and absent/foreign identity is404. No silent empty result substitutes for authorization or provider failure.

| Operation | Admitted filters beyond limit/after_id/sort | Safe row contract |
|---|---|---|
| customer.list | status, lifecycle, assigned_user_id, source, operator_id (actual contract involvement) | Commercial display/account/lifecycle/status/source/owner/version; no fiscal ID |
| contact.list | customer_id, status | Human display/job title/primary/status/version and has_email/has_phone booleans; no contact methods |
| opportunity.list | customer_id, owner_user_id, stage_id, status, currency, expected_close_from/to | Stage/owner/customer IDs, bounded contract/service/plan link IDs, exact decimal minor-unit string, close/follow-up dates, has_next_action; no note/action body |
| activity.list | customer_id, kind, entity_kind/entity_id, date_from/to | Six coded summaries, timestamps and bounded real customer/contract/service/opportunity/task/meeting IDs; no audit/message/note payload |
| assignee.list | role:owner/admin/member | user_id, display_name, role; current active members only, no email/invitation/admin controls |
| operator.list / operator.get | status, source for list | Registered code/display/status/source; list defaults active |
| plan.list / plan.get | operator_id, service_kind, status for list | Operator/code/display/kind/status; list defaults active |
| plan_version.list / plan_version.get | plan_id, operator_id, service_kind, status (parent plan), valid_on for list | Frozen version/validity/currency/recurring_amount_minor; money is a decimal string, including bigint values beyond JS precision |
| contract.list | customer_id, operator_id, plan_id, assigned_user_id, status, source | Current safe contract identity/status/ancestry/dates/version; no provider references |
| service.list | customer_id, contract_id, operator_id, plan_id, kind, status, source | Safe service label/ancestry/plan/dates/status/provenance/version |
| line.list | customer_id, contract_id, service_id, operator_id, status, source | Safe label/ancestry/status/dates/provenance/version; protected MSISDN/SIM/porting fields are still absent, not claimed complete |
| renewal.list / renewal.get | customer_id, contract_id, owner_user_id, status, window_from/to for list | Actual renewal dates/state/source and derived attention state |
| permanence.list / permanence.get | customer_id, contract_id, service_id, status, window_from/to for list | Term dates/kind/source/status and signed days_remaining plus current/upcoming/expired/cancelled timing state |

Date range endpoints must both be present, valid ISO calendar dates1900..2199, ordered and at most366days apart. Activity day boundaries use Europe/Madrid; derived renewal/term dates use the current Europe/Madrid calendar day. Entity filters are paired, closed to actually stored ancestry columns; line/document targets are not fabricated. Direct JWT RPC callers receive the same closed-input validation and current membership checks. A revoked still-valid JWT is denied on every operation.

The static server registry validates exact DTO fields and rejects private-field additions, bad IDs/dates/money, duplicate or out-of-order pages and inconsistent cursors before transport. Database query dispatch is a closed18-operation case, with explicit projections and no caller SQL/table/column selection. The only new execute grant is authenticated `telecom_collection_v1_query(uuid,text,jsonb)`; its scope helper holds workspace/membership authorization rows until commit. Catalog management and commercial entitlements remain separate TEL5 gaps.

Local evidence:251Node tests PASS (244existing+7new);55migrations/248privilege entries; local embedded SQL fixture tests all18reads,384line full pagination, filters, foreign scope, raw projections and revocation. Official native fresh/restore and real Supabase18-cookie-reader acceptance are wired into both harnesses and are pending execution at the published candidate. Existing129-operation source acceptance remains traceable to3ebed3f; no new operation is credited PROVEN before actual candidate evidence.
