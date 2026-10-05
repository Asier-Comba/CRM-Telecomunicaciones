# Requested sensitive reveal v1

Candidate, default-off POST /api/sensitive/v1 with PRODUCT_V1_ENABLED and exact PRODUCT_V1_ORIGIN. Current SSR/JWT membership and scoped SQL authorization each call. UI_SAFE=false. Operation sensitive.get is a protected human read, excluded from generic AI read access pending explicit privacy gate.

Input {entity_kind:contact|customer,entity_id:UUID,fields:[allowlisted ids]}. No actor/workspace/table/column selection;1..2 unique fields, closed4KiB envelope. Contact fields email/phone: owner/admin/member, active contact and active same-workspace customer. Customer fiscal_id: owner/admin only, actual billing_customer_profiles.tax_id; absence returns null, no extra fiscal profile. Viewer denied both. Foreign entity404 and foreign scope403; suspended valid JWT denied. No service-role/assistant authority.

Output {contract_version:sensitive.v1,operation:sensitive.get,entity_kind,entity_id,values:{only requested fields}}. Exact target/keys/bounds validated, no-store. No whole-row/name/contact list or automatic PII expansion. No cache/URL/log persistence.

Every successful requested read inserts a private append-only forced-RLS reveal audit: actor,workspace,entity,field categories,timestamp. No field values, labels or error payload. Audit failure aborts disclosure; failed/denied reads create no successful audit. CAS/command replay are inapplicable to this read; each successful fresh read has its own audit.

Prepared remotely after local executor stopped responding.49 migrations/235 privilege functions and228 Node tests expected; NO local pass claimed. Native fresh/restored/embedded audit rollback and real SSR contact email/phone, fiscal ID, explicit role/tenant/revocation/request minimization/audit-failure tests published as candidates, await exact CI. No broad AI registration, provider or production action.

Prior settings741eb44/run37351991972 accepted1121 real checks with private PNG flow/reference/archive and effective persisted notification optout.225 Node/lint/types/build and native48/233 PASS; full audit still5high Issue29.121 previously observed operations plus sensitive.get candidate=122.
