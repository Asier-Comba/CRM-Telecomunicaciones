# product.v1 — human application commands

This module does not register assistant capabilities. Existing telecom.v1 signatures
and raw table grants are unchanged. W2 may use the server-only
`createProductUserServiceV1()` factory from thin routes/actions after platform review.
No HTTP endpoint or frontend integration is added in this checkpoint.

## Customer/contact checkpoint

Inputs and results: `src/lib/contracts/product-v1.ts`.
`ProductServiceV1.execute(operation, unknownInput)` resolves server membership
on every call, rejects unknown/accessor/exotic input, invokes a user-JWT RPC and
validates a closed receipt. It never accepts actor/workspace/status/source fields.

| Operation | Required input in addition to command_id | Optional fields |
|---|---|---|
| customer.create | account_kind, legal_name | trade_name, lifecycle, assigned_user_id |
| customer.update | id, expected_version | account_kind, legal_name, trade_name, lifecycle, assigned_user_id |
| customer.archive / restore | id, expected_version | none |
| contact.create | customer_id, display_name | job_title, email, phone, is_primary |
| contact.update | id, expected_version | display_name, job_title, email, phone, is_primary |
| contact.archive / restore | id, expected_version | none |

`command_id` is a UUID generated once per logical user action and reused for retry.
Changed inputs under the same actor/workspace/key produce conflict. Receipt:
`{contract_version:'product.v1',command_id,operation,id,version,status}`.
Errors: validation, access_denied, not_found, conflict, unavailable, internal_safe.
No raw DB/provider error, tenant/actor fields or contact PII in receipts/audit.

`customerEditor(id)` returns editable identity/version/provenance, never tax ID.
`contactEditors(customerId,limit,afterId)` returns explicitly PII-authorized contact
editors, bounded 1..100 with ordered UUID keyset and next_id; absent/foreign parent
returns not_found. It is distinct from generic search/list DTOs.

Authorization is intentionally the existing owner/admin mutation policy. Ordinary
member/viewer writes and contact PII editing are denied; expanding commercial
permissions requires an explicit product policy. No service-role execution grant.
Actor is auth.uid() in PostgreSQL, not a supplied actor. Workspace selection is
resolved server-side and rechecked by the DB. Authorization rows are held until
transaction commit so revocation cannot interleave with an authorized effect.

Business mutation, receipt and safe audit/activity commit atomically. A private
HMAC key prevents low-entropy PII hashes in the replay ledger. This is DB-private
key material, not a claim of application-level encryption/secret-vault isolation.
Same-key transactions serialize; errors roll back the reservation too. Replays
reauthorize and return the original receipt (refresh editors for current version).

Contact-primary promotion serializes on the customer row, demotes the prior primary
and increments its version. Refresh contacts after promotion. Restoring a contact
does not automatically restore primary status. Archived parent blocks contact edits.
Customer restore returns active. Imported/integration customers cannot be manually
updated/archived/restored. Fiscal identity/address/notes are intentionally not yet
published because their dedicated permission/model contract remains open.

## Evidence and remaining gates

Forward migrations: 20261003132000 + 20261003134000; published 25 unchanged.
SQL fixture executes actual authenticated/anon/service roles, synthetic auth.uid,
A/B, stale version, changed-key arguments, replay, primary promotion, archive/restore,
revocation/suspension, bounded editors and forced audit-failure rollback.
PGlite is not real Supabase Auth/PostgREST or native process-race evidence.
CI275 at bd996a9 passed native PostgreSQL16 fresh/restored grants and 27 migrations.
Native CI also runs 20 separate psql create races, 20 CAS update races, replay and
revocation in a separate disposable database; those native results passed in CI275. Final follow-up must keep them passing.

Reviewed PR24 tests were selectively adopted, without merge, and the explicit
function privilege manifest extended for product RPCs/helpers. Native restore
preserves ACLs, compares fresh/restored metadata, executes role controls and rejects
a deliberately unsafe no-ACL restore. Product fixtures execute fresh and restored.
Native bootstrap now places pgcrypto/btree_gist in the canonical extensions schema.
PR25/26 remain unmerged; real local Supabase acceptance for new commands is pending.
Issue10 assistant writes remain blocked; staging/production remain unauthorized.

CI275 full quality job is red solely at the inherited all-dependency audit after
lint/types/138 tests/build passed. Issue29 tracks GHSA-vfj7-8cjw-p6xm; no patched
braces release currently recorded upstream. No gate bypass or incompatible
ESLint downgrade was applied. Remaining product modules are not implemented.

## Continuation 2026-10-04

The concurrent published B3 ce8b1fd is adopted without duplicate migrations.
Its exact work/calendar/stage/get contracts are authoritative in
PRODUCT_WORK_V1_CONTRACT.md. Extra candidate transport: POST
/api/product/v1/commands or /queries, closed {operation,input}, no-store,
Origin and Fetch-Site checks, JSON identity encoding,12KiB streaming cap.
Commands use registered product.v1 operations. Reads: calendar.list -> calendar(),
work.get {kind,id} -> workGet(), opportunity.stages {limit?,after_id?} -> stageCatalog(),
customer.editor {id}, contact.editors {customer_id,limit?,after_id?}.
PRODUCT_V1_ENABLED=true enables routes (default unavailable).
Forward migration30 extends normal customer/contact/editor capabilities to member;
viewer keeps only work/calendar reads. Fiscal/team/integration scopes are unchanged.
Actual Auth/JWT/PostgREST and Next cookie acceptance extends reviewed PR25 harness.
Auth credentials are transient synthetic data; native/Supabase execution awaits CI.
