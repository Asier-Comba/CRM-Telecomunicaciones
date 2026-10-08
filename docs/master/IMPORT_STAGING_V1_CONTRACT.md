# Encrypted import staging v1

Current acceptance: c2a7390867d941a33b17509b3f4014f8356bb0c1, real run37361774116 (1,298 checks), native/quality37361774252 (53 migrations/247 privilege entries/243 Node tests). [Authoritative closure](W1_PRODUCT_CLOSURE_20261005.md) records the limits. Disposable staging only; production import processing remains blocked.


Prepared internal contracts; normal product import processing remains blocked. No begin/validate/apply/resume route is registered. No customer data is applied or persisted in plaintext.

## Provider contract

EncryptedImportStagingV1: health, authorize(jobId,purpose), put(grant,bytes,optionalObjectUUID), get(grant,ref), delete(grant,ref). Production provider requires a registered implementation, private key reference, workspace/job scope, current authorization and canonical import-domain adapters. No production provider is registered. An environment flag does not prove availability.

The disposable adapter is restricted to a test Node process; production cannot override the guard. IMPORT_STAGING_TEST_KEY is a fresh 32-byte test key supplied at runtime, never committed or logged. AES-256-GCM uses a fresh 12-byte nonce; HKDF separates encryption and source HMAC purposes by workspace and job. AAD binds workspace, job, object. Files contain version, nonce, tag and ciphertext only. Directories 0700/files 0600; UUID-only paths, no symlinks, atomic hard-link publication, exclusive temporary objects, immutable identical retries and changed-byte conflicts. Local filesystem provider is disposable only, not a production durability claim.

Opaque grants are recognized only by their issuing instance and expire in 30 seconds. Each action rechecks current actor/owner-admin membership and actual job state, before and after I/O. A still-valid revoked JWT does not authorize access. Process/stage require uploaded/mapping/validating/ready; cleanup requires completed/failed/cancelled and exact verified reference. There is no wildcard delete. References expire 24h after durable file mtime; caller-modified expiry is rejected.

## Validation

CSV only: fatal UTF-8, exact account_kind/legal_name schema, quoted commas/escaped quotes, CRLF/LF, 2 MiB, 1,000 data rows, 20 columns, 1,000 characters per cell, legal name 200. Closed safe error codes and row indexes omit rejected values. Formula-like cells are rejected. Preview is at most 20 rows/errors with explicit continuation. Validation is memory-only and does not create manual-source customers on behalf of imported rows.

XLSX is unregistered; ZIP is blocked. Quarantine upload intent is a prepared internal typed object reference, not a browser endpoint or storage policy authorization. Retention is adapter reference expiry; an unattended production deletion scheduler is absent.

## Evidence

Node tests and the real local Auth/PostgREST fixture are accepted at the recorded source. Real fixture uses actual current membership and importjob_v1_get/cancel, a fresh disposable key/root, roundtrip, twenty immutable retries, foreign scope, forged grant, revoked JWT, canonical cancellation and exact terminal cleanup. It explicitly reports PASS_DISPOSABLE_ONLY, never normal production processing PASS. No new human product operation is registered by this block.

## Remaining gate

Register a provider-neutral production KMS/encrypted-object adapter and narrowly scoped worker principal; add canonical import-source domain adapters and durable bounded apply checkpoints before enabling normal processing. No plaintext fallback, generic service-role worker, arbitrary format parser or synthetic production availability is accepted.
