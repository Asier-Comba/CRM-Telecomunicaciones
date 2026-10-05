# document.content.v1 — pending uploads and revocable private downloads

Normal human USER-JWT service. No service-role product identity, provider execution or assistant registration. Existing document.v1 metadata/CRUD shapes remain unchanged; pending documents are hidden from its active/archived editor.

| Operation | Closed input | Result |
|---|---|---|
| document.request_upload | command_id, target_kind, target_id, document_kind, media_type, size_bytes, file_name | Pending document id/version1 and expiry; server-generated object UUID; no locator in product response |
| document.finalize_upload | command_id, id, expected_version | Pending→active after matching actual Storage metadata; atomic receipt/audit/version |
| document.request_download | command_id, id, expected_version | Actor/workspace/document-bound ticket,30s expiry; identical replay preserves original expiry |
| document.download | id, ticket_id | Authorized proxy attachment bytes; no permanent or signed Storage URL |

Commands: POST /api/document/v1/content/commands with {operation,input}. Upload: POST /api/document/v1/content/upload?id=UUID, raw bounded PDF/PNG/JPEG bytes. Download: POST /api/document/v1/content/download with {operation:"document.download",input:{id,ticket_id}}. All require PRODUCT_V1_ENABLED and PRODUCT_DOCUMENT_CONTENT_ENABLED (both default OFF), canonical PRODUCT_V1_ORIGIN and exact Host/Origin. Server SSR-cookie getUser + selected active membership determine actor/workspace. No caller object path/bucket/role/workspace is accepted.

| Role | Metadata | Request/upload/finalize | Ticket/download | Archive/restore |
|---|---|---|---|---|
| owner/admin | Existing protected service | Allowed | Allowed | Existing protected service |
| member/viewer | Denied | Denied | Denied | Denied |

This deliberately preserves the current protected-content policy, including identity/fiscal documents. A broader commercial policy requires classification and per-target access semantics; it is not inferred from commercial membership. Other new product families must use their own appropriate role rules.

Upload intent expires in10min and binds the creator, workspace, immutable target, generated document/object UUID, MIME and exact declared size (1..10MiB). Storage INSERT RLS permits only the matching pending object for the live authorized creator. No UPDATE/upsert/delete or quarantine policy is added. Pending SELECT is limited to that uploader for verification/retries. Request replay returns the original intent, including expiry. A fresh attempt requires a fresh key and object.

Upload proxy enforces a streaming byte cap even with absent/dishonest Content-Length. Existing-object retry compares exact bytes and rejects changed bytes; no replacement occurs. Upload never finalizes implicitly. Finalization reads Storage.objects for the exact bucket/path and requires object metadata size/type to match. Missing/mismatched/null metadata or expired intent cannot activate or retain a command reservation. Version/audit/receipt commit together. Existing identity constraints preserve path/target/MIME/size/digest after creation.

A download ticket is scoped to its creator and current document/workspace. Consumption reauthorizes active owner/admin membership/workspace, active metadata, actor and expiry. Archive denies an existing proxy ticket immediately; restore may reauthorize an unexpired ticket, while expiry is never extended. Every response is no-store, nosniff, attachment and CSP sandbox; file names/locators remain outside product receipts. Existing native Storage read permissions for authorized administrators are unchanged; independent native signed URLs retain their upstream expiry limitations. This service mints no such URLs.

Expired intents/orphans remain pending and unreadable outside the uploader's live intent; they never silently become active. Automated object cleanup is not implemented. No malware scan or cryptographically verified SHA256 is claimed: Storage metadata establishes existence/size/MIME, not trusted file content. Files remain untrusted attachments. Scanner/integrity attestation, encrypted import quarantine, ZIP extraction and private authoritative invoice-PDF association are separate open capabilities. No plaintext import staging or fabricated extraction support is added.

Candidate evidence:205 Node tests;42 migrations/177-function fresh embedded matrix and SQL pending/object/ticket/replay/CAS/role/foreign/expiry/revocation fixture. Native fresh/restored and20-process finalization races, plus actual Auth/JWT/Storage/SSR-cookie acceptance are added and remain pending exact published-head CI. UI_SAFE=false; BACKEND_READY_FOR_W2_REVIEW requires that evidence and consumer review. No production or real documents.

Exact executable eff802274f20d3612f1a36ca6335f99ca38f8c2c: Supabase32/37306726843 PASS568 checks, browser boundary and teardown PASS; CI311/37306726804 native42migrations177functions/fresh+restored/20-process finalization PASS,205 tests/lint/types/build PASS. Full audit remains FAIL under Issue29. Four content operations individually observed through real Auth/Storage and cookie transport. BACKEND_READY_FOR_W2_REVIEW:YES; UI_SAFE:false; scan/hash certification and cleanup remain open.
