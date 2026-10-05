# Requested sensitive reveal v1

Current acceptance: c2a7390867d941a33b17509b3f4014f8356bb0c1, real run37361774116 (1,298 checks), native/quality37361774252 (53 migrations/247 privilege entries/243 Node tests). [Authoritative closure](W1_PRODUCT_CLOSURE_20261005.md) records the limits. Human backend only; UI_SAFE=false pending W2/W4.


Default-off POST /api/sensitive/v1 with PRODUCT_V1_ENABLED and exact PRODUCT_V1_ORIGIN. Current SSR/JWT membership and scoped SQL authorization each call. UI_SAFE=false. Operation sensitive.get is a protected human read, excluded from generic AI read access pending explicit privacy gate.

Input {entity_kind:contact|customer,entity_id:UUID,fields:[allowlisted ids]}. No actor/workspace/table/column selection;1..2 unique fields, closed4KiB envelope. Contact fields email/phone: owner/admin/member, active contact and active same-workspace customer. Customer fiscal_id: owner/admin only, actual billing_customer_profiles.tax_id; absence returns null, no extra fiscal profile. Viewer denied both. Foreign entity404 and foreign scope403; suspended valid JWT denied. No service-role/assistant authority.

Output {contract_version:sensitive.v1,operation:sensitive.get,entity_kind,entity_id,values:{only requested fields}}. Exact target/keys/bounds validated, no-store. No whole-row/name/contact list or automatic PII expansion. No cache/URL/log persistence.

Every successful requested read inserts a private append-only forced-RLS reveal audit: actor,workspace,entity,field categories,timestamp. No field values, labels or error payload. Audit failure aborts disclosure; failed/denied reads create no successful audit. CAS/command replay are inapplicable to this read; each successful fresh read has its own audit.

Validation at the recorded accepted source uses remote native fresh/logical restore/embedded fixtures and real SSR contact email/phone/fiscal-ID calls, explicit role/tenant/revocation/request minimization and atomic audit-failure denial. No local execution pass is inferred from those remote results.

