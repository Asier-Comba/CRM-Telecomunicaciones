# Import job management v1 — partial C4, processing blocked

Owner/admin only, active workspace and live membership rechecked on every call/replay, default-off `PRODUCT_V1_ENABLED`, normal SSR user client, canonical Host/Origin, bounded closed 4096-byte envelope at `POST /api/import/v1`. UI_SAFE=false; BACKEND_READY_FOR_W2_REVIEW:PENDING_ACTUAL_SUPABASE.

| Operation | Input | Behavior |
| --- | --- | --- |
| importjob.get | id | Existing canonical job, safe counts/checkpoint/status/version; foreign IDs hidden |
| importjob.list | limit1..100, after_id, optional status | Stable ascending UUID cursor, default20, isolated workspace |
| importjob.cancel | command_id, id, expected_version | Atomic version CAS, HMAC-bound command replay, coded product/business audit, cancellation only before applying |

The forward migration extends the existing import_jobs rather than replacing the import model. Reads never expose file refs, digest/HMAC, ciphertext refs, actor identity, mappings with raw values, staging payload or rejected data. `processing_status=blocked_encrypted_staging_adapter` is explicit on every record. Safe checkpoint/counters come from the canonical foundation; no simulated validation or fabricated import result is returned. Cancellation preserves monotonic counters and the foundation's durable-row checks. Applying/completed/failed/cancelled jobs cannot be cancelled or resumed; changed replay conflicts and authorization is required even on a completed cancellation replay. Cancellation itself does not grant quarantine access or claim deletion of any source object.

C4 remains blocked for begin/validate/apply/resume: approved encrypted-payload store/KMS/decrypt adapter, integrity-verified quarantine source ingest, and closed per-domain application adapter are absent. Those operation names are rejected and not registered in the capability catalog. No plaintext JSON fallback, guessed credential, service-role product identity, direct CSV-to-core writer, ZIP extractor, provider connection or AI write is added. Existing private-quarantine client-denial evidence remains valid; upload is not implemented. Missing dependencies are not presented as a successful import. Do not show an enabled Apply button from this management contract.

Independent synthetic SQL fixture covers scope/role, cursor, closed DTOs, cancellation replay/CAS/terminal semantics, audit rollback and revocation; real disposable Supabase fixture observes the three operations individually through SSR plus twenty cancellation replays and live JWT revocation. Metadata-only fixture job setup is privileged synthetic setup and provides no evidence of encrypted staging or core application. Processing readiness remains BLOCKED even when management acceptance passes.
