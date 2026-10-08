# Protected telecom identifiers — human identifiers.v1

Transport: POST `/api/identifiers/v1`, canonical same-origin cookie session, `PRODUCT_V1_ENABLED=true`, no-store. No credentials, URL parameters, browser persistence, raw domain CRUD or AI writes. Current workspace comes from authenticated membership; every SQL operation rechecks and locks current authorization, including exact receipt replays.

| Operation | Required input | Optional input | Roles |
|---|---|---|---|
| identifier.create_manual | command_id, entity_kind, entity_id, identifier_kind, canonical_value | none | owner/admin/member |
| identifier.retire | command_id, id, expected_version | none | owner/admin/member |
| identifier.list | entity_kind, entity_id | limit 1–100 (default 50), after_id, status active/retired | owner/admin/member/viewer |
| identifier.get | id | none | owner/admin/member/viewer |

Closed entity/kind pairs: line/msisdn; service/circuit_reference; contract/provider_account_reference or provider_contract_reference. SIM ICCID/EID and equipment IMEI/serial await their respective resource models; PIN/PUK/secrets are excluded. Generic imports do not accept protected values. Production protected imports remain blocked pending a dedicated protected staging path.

MSISDN must already be an unambiguous canonical international value: `+` followed by 8–15 digits, first digit nonzero. No guessed country, punctuation removal or display formatting rewrite. References use exact case-sensitive ASCII tokens, length 8–96, `[A-Za-z0-9][A-Za-z0-9._/-]*`. Display formatting is separate from canonical comparison; the safe DTO returns only `••••` plus the last three characters. There is no raw substring or exact lookup endpoint.

The protected table is normalized, tenant-scoped, ancestry-validated and closed even to service_role. One active identifier per entity/kind. Active MSISDN is unique in a workspace; circuit/provider-contract references are unique per operator. Account references can span contracts and therefore are not incorrectly globally unique. Retiring preserves immutable identity and dates; reassignment creates a new row. CAS and command HMAC/idempotency prevent duplicate effects. Imported/integration parents reject manual identifier attachment; external identifiers reject retirement.

Safe row: id, entity_kind, entity_id, identifier_kind, masked_display, status, source, valid_from, valid_until, version. List uses immutable UUID ascending keyset; get wraps record. Command receipt: contract_version, operation, command_id, id, version, status. No raw value in receipts/audit/activity/notification/global search. Normal line rows remain safe; W2 can compose the bounded entity identifier page. The generic line list does not yet embed masked number or SIM state.

Explicit reveal: POST `/api/sensitive/v1`, operation `sensitive.get`, input `{entity_kind:'telecom_identifier',entity_id:<identifier UUID>,fields:['canonical_value']}`. Owner/admin/member only; viewer denied. Returns that field alone, after atomic value-free audit insertion and current active-customer authorization. Fiscal/contact field policies remain unchanged. Reveal has no AI registration.

Acceptance: local SQL checks canonical rejection, masks, ancestry, raw access denial, receipt privacy, retirement/history, CAS/replay and current revocation. Native fixtures run fresh and logical restore plus independent-process races. Real disposable Supabase suite uses actual Auth/JWT/PostgREST and cookie application routes for each operation, viewer/tenant denial, concurrent assignment, audited requested reveal and same-JWT revocation. Published source remains a candidate until these exact-source jobs pass; fixture existence does not imply real proof.
