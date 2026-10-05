# Server-observed document integrity and bounded pending cleanup

Candidate default-off transport /api/document/v1/maintenance. Requires PRODUCT_V1_ENABLED plus PRODUCT_DOCUMENT_MAINTENANCE_ENABLED and same-origin protected cookie identity. Owner/admin only; current DB scope before all replays.

## Integrity

document.verify_content input: command_id, id, expected_version, ticket_id. Server obtains the existing scoped, unexpired download manifest and actual user-JWT Storage bytes; validates size and computes SHA-256. It signs a purpose-specific witness binding workspace, current Auth actor, root command, document/version/ticket, object UUID, MIME/size/hash and measured milliseconds. A private DB verifier key must be explicitly installed and match the server-only environment key; absent/expired verifier fails closed. Witness expires in 60 seconds, tolerates only five seconds of future drift, and never enters a browser response or audit payload.

The authenticated SQL function rejects caller hashes lacking a valid server witness. Atomic CAS advances document version and stores an append-only SHA-256 reference only after witnessed bytes. Matching retries preserve the original certificate; a changed hash for the same immutable object conflicts instead of silently recertifying corruption. Original root input HMAC preserves identical/changed replay semantics. Normal proxy downloads compare actual bytes against a stored matching object/size/type hash and return conflict on same-size corruption. Existing unverified documents stay metadata-only until measured. Existing frozen invoice PDF regeneration remains independent.

No production scanner is registered. scan_status is always not_scanned, never clean. DocumentScannerV1 is a provider-neutral interface; a test-only deterministic fixture may reject a synthetic pattern or return fixture_only. It does not establish antivirus cleanliness. PRODUCT_DOCUMENT_SCAN_REQUIRED=true blocks verification while the production scanner is absent. No MIME label or fixture result is a security scan.

## Cleanup

document.expired_list: bounded UUID cursor, 20/default and 100/max, ids/versions only, pending intents expired at least 24 hours. document.cleanup_claim: closed command_id/id/expected_version CAS, exact pending object and immutable canonical path; sets a ten-minute current-actor claim and advances version. document.cleanup_finish: server checks current claim and CAS before deleting that exact private object through USER-JWT Storage policy, then SQL verifies object metadata is absent before archiving metadata with atomic audit and stable receipt. Normal finish replays skip deletion after rechecking current scope and input HMAC. Claim renewal after expiry requires a new command/version. Two explicit commands expose incomplete work honestly; no background scheduler is implied.

DELETE/SELECT Storage policy matches only an exact current claim for a pending, long-expired object; current owner/admin membership is checked. There is no bucket-wide or prefix cleanup, no arbitrary caller path, and no service-role product identity. Active/archived documents and valid PDF revisions are ineligible. Unlinked active PDF artifacts remain retained until reference/reachability and scoped cleanup authority are separately proven.

## Acceptance

Prepared Node tests; native/embedded fresh/restore fixtures validate witness authority, append-only hash, role/claim transitions and absence-before-finalization. Disposable real Auth/PostgREST/Storage/Next fixture independently measures bytes, twenty verify/claim/finish replays, stale/changed inputs, role/foreign/revoked JWT, same-size privileged synthetic corruption, exact deletion and active object retention. CI-only verifier key is fresh, runtime generated and removed with the stack; no key is committed or printed. CI must PASS before marking these four operations proven. All ui_safe:false; no AI registration.
