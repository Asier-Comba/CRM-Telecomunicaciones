# Private frozen fiscal PDF v1 — candidate, default off

C3 source checkpoint, 2026-10-05. BACKEND_READY_FOR_W2_REVIEW: YES (candidate). UI_SAFE: false. No provider, OAuth, public object, assistant registration or real customer data.

## Product contract

`POST /api/billing/v1/private-pdf` uses the normal SSR user cookie, active workspace membership, owner/admin role, exact canonical Host/Origin and a closed 4096-byte JSON envelope. Both `PRODUCT_V1_ENABLED` and `PRODUCT_DOCUMENT_CONTENT_ENABLED` must be true; defaults are off. Never use an elevated client for product execution.

| Operation | Input | Result |
| --- | --- | --- |
| invoice.persist_private_pdf | command_id, id (invoice), expected_version, expected_artifact_version (0 initially) | Closed receipt with immutable artifact revision and document UUID |
| invoice.private_pdf_reference | id (invoice) | Latest private reference and active/archived document status, never path/URL/hash/fiscal fields |
| invoice.private_pdf | id (invoice) | Authorized verified PDF attachment bytes, no-store and nosniff |

The normal `invoice.issue` route optionally completes persistence after its authoritative financial transaction. The forward migration queues a private pending job atomically on issuance; an optional Storage failure cannot undo issuance or falsify the issue receipt. Direct RPC issuance queues only: SQL does not call Storage. Existing issued/paid invoices are queued as pending, not declared persisted. There is no background worker or public pending-job read endpoint in this checkpoint. Human persistence can retry explicitly. A reference missing after successful issuance means the optional phase is pending/failed, not that the invoice failed.

Persistence reads the protected authoritative fiscal snapshot, computes canonical PDF bytes server-side, uses the document content upload/finalize workflow and then attaches the document with invoice CAS and artifact-revision CAS. It does not accept caller bytes, object path, document UUID or hash at the product endpoint. Separate Storage and SQL phases are deliberately recoverable, not falsely described as one transaction: deterministic child command UUIDs recover an existing upload/finalize; completed root replay checks the original input MAC and reauthorizes before returning its receipt. Failed final attachment can leave an active unlinked document; expired pending uploads and unlinked active attachments need a future cleanup policy. No cleanup worker is implemented.

## Fiscal bytes and trust

`billing.snapshot.pdf.v1` records the renderer semantics. The rendering projection fixes status to issued, paid_at to null and overdue to false; financial data, numbering, issuer/customer snapshots and issued_at remain authoritative. Payment/display-version changes therefore do not alter fiscal bytes. This is separate from the existing on-demand display PDF, whose paid label can change. No published renderer or financial migration is edited.

SQL validates scope, active billing document, PDF MIME, bounded size, matching invoice customer, issued/paid invoice and both CAS versions. An owner/admin can still associate an untrusted document directly through the authenticated SQL RPC; therefore the artifact is explicitly `stored_candidate`, and metadata always says `verification_required: true`. SQL does not certify contents or claim a persisted SHA-256. Every normal fiscal download regenerates the frozen projection and compares exact length plus SHA-256 with timing-safe digest comparison. Mismatch returns conflict and never streams those bytes. The reference is not evidence of successful byte verification. Generic document downloads remain untrusted attachments.

Artifact rows are append-only. A verified new revision can repair a corrupted candidate without replacing prior associations or changing financial invoice version. Payment changes preserve the fiscal snapshot; archive denies download, restore reauthorizes the same stored bytes, and membership suspension with a still valid JWT denies both reference/content. Tickets and Storage policy use the existing private bucket and current authorization; no signed URL is minted.

## Evidence boundaries

Fresh embedded migration and independent synthetic SQL fixture cover issuance job, association/replay, payment replay, dual CAS, no financial mutation, immutable revision, audit rollback, member/revoked/anon/service-role denial. Node cases cover frozen bytes, corrupted bytes, forbidden caller inputs and optional failure. A real disposable Supabase fixture is committed for SSR on-issue processing, actual stored bytes, paid stability, role/tenant denials, archive/restore, privileged synthetic corruption rejected by the normal route, new revision repair, twenty completed replays and live revocation. Actual fixture results must be recorded at the published source SHA before any operation is marked individually proven. W2/W4 review remains required.

Accepted executable evidence: `78dd6402ead3b5035b09d2bb221b020dcbb0e922`, actual Supabase38/run37310308926 PASS609 with all five private artifact reports PASS, browser-private-boundary PASS and teardown PASS. Native CI317/run37310308922 fresh+restore PASS43/182; quality209 Node/lint/types/build PASS and full npm audit remains blocked by Issue29. All three artifact operations have individual exact-head observations; UI_SAFE remains false. W2 handoff PR30 comment5994613403.
