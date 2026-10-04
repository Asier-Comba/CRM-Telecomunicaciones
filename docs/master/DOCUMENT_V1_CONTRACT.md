# Protected document.v1 metadata lifecycle

Normal human application service, active owner/admin only, aligned with the existing private document object policy. Member/viewer, foreign workspace, inactive membership/workspace, anonymous and service_role callers cannot execute these protected metadata RPCs. SQL derives auth.uid and holds active authorization rows through commit/replay. No assistant registration or provider connection.

| Operation | Closed input | Output |
|---|---|---|
| document.list | target_kind, target_id; optional status(active default/archived), limit(default20/max100), after_id | UUID-keyset page, next_id or null |
| document.get_metadata | id | Safe metadata record or not_found |
| document.archive | command_id, id, expected_version | Atomic active→archived receipt/version/audit/activity; existing object read policy denies archived metadata |
| document.restore | command_id, id, expected_version | Atomic archived→active receipt/version/audit/activity; preserves storage identity and target |

Types: src/lib/contracts/document-v1.ts. Safe metadata is exactly id/version/status/document_kind/media_type/size_bytes/target(kind,id). Protected file_name, object locator/bucket, content digest, signed URL and bytes remain outside this DTO; this read is not a content capability. Metadata may describe legacy objects outside the current upload policy; the read does not accept/finalize new uploads or certify their integrity.

Targets are the existing one-FK customer/contract/service/line/service_case/opportunity model. Listing by another tenant's target returns no rows; protected get resolves only within the authoritative workspace. Archived metadata remains inspectable by authorized administrators. Raw relations remain closed and immutable storage/target constraints are preserved.

Commands require a stable UUID command_id across retries and expected_version from the editor. Identical replay returns the original receipt even after later edits; changed input/stale CAS conflict; already-state commands with a new key are invalid transitions. A forced audit failure rolls back the document version/status, activity and replay reservation together. Labels/file names/paths never enter these private audit receipts.

Transport: POST /api/document/v1/commands or /api/document/v1/queries with {operation,input}; default OFF PRODUCT_V1_ENABLED + canonical PRODUCT_V1_ORIGIN. Shared exact Host/Origin, POST/JSON/UTF8/8KiB bounds, no-store and safe error union. Server SSR-cookie getUser + selected active membership, USER-JWT port only. Clients cannot supply workspace/actor/role/object path or invoke unavailable upload/signing operations.

Candidate evidence:201 Node tests,40 fresh migrations/168-function embedded privilege matrix and SQL protected roles/paging/CAS/replay/suspension/storage policy predicate/audit rollback PASS. Native fresh/restored fixture +20 independent CAS archives/20 same-key restore processes added. Actual Auth/JWT/PostgREST/Storage byte access/20-request lifecycle/revocation/real Next-cookie metadata/archive acceptance added; exact-head CI pending. Prior search261dfdf has CI298/native39migrations161functions PASS and Supabase19 PASS489checks; that evidence does not cover this extension.

Remaining document workflow: request_upload, finalize_upload, server-generated opaque object intents, streaming size/MIME/hash validation and quarantine/scanner policy, safe short-lived per-request access. No raw client upload policy, upload token, arbitrary path, service key or signed content capability is added. Import quarantine remains separate and unreadable to clients. Private invoice object storage/opaque references and the canonical import application adapter remain open. UI-safe=false pending W4/W2 review; no deployment/main merge.

Exact recovered executableb5955fb1bb540036802b57e2e0644be221c8801c: CI302/37224799203 native41migrations168functions/fresh-restored privileges/ACL-loss negative/20process lifecycle races PASS. Supabase23/37224799063 PASS522checks including document bytes denied after archive and allowed after restore, valid-JWT suspension and real Next-cookie metadata/archive; browser boundary/teardown PASS. Quality201tests/lint/types/build PASS; inherited Issue29 full audit remains red. Candidate pending evidence above is superseded for these four metadata operations. Upload/signing remain NOT_IMPLEMENTED. The final report/catalog update changes no executable source.
