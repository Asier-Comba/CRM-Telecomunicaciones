# W1 product backend completion — 2026-10-05

Exact-source TEL5-00 functional evidence: `3ebed3ff993c38cd74d60d8e3c6e4f3ed28af56c`; real Supabase run37370409567 PASS1298/129observed; native run37370409687/job111977630518 PASS54migrations/247privileges/fresh/restore;244Node/lint/types/build PASS; local actual private-canary scan47bundles PASS. Official browser CI cancelled twice, retry requested: not a PASS or fully-green workflow. Issue29 remains unsuppressed. [Exact evidence](W1_TEL5_00_EXACT_HEAD_EVIDENCE.md). Earlier source references below are historical. No new TEL5 operations are claimed by this documentation checkpoint.

This is the authoritative current checkpoint, superseding historical 90-operation/44-migration/186-function and 80-operation summaries. The code remains on Draft PR #28, branch w1/product-backend-v1, default-off. Source acceptance: c2a7390867d941a33b17509b3f4014f8356bb0c1; executed PR checkout 8f14da513a5c122e2de3542d19ecdbe6ba32e21b has exactly the same Git tree 9442df0abfb48e48fbecb0c0d46f6146f6a28229 as that source HEAD; real run 37361774116; native/quality run 37361774252. The subsequent catalog/document checkpoint adds no executable behavior. Every operation is human-only and ui_safe:false pending W2/W4; no assistant registration, frontend changes, W2 branch edits, production credentials, providers, merge or deployment.

## Exact evidence

53 canonical migrations; 247 explicit function privilege entries; 243 Node tests; 1298 real Supabase checks. Native PostgreSQL fresh zero-to-head and logical synthetic restore/role/ACL/RLS checks PASS. Embedded PGlite is separate corroboration, not PostgreSQL recovery or Supabase runtime proof. Real disposable Auth/JWT/PostgREST/Storage and normal cookie transports PASS, 129/129 registered operations individually observed (91 writes, 38 reads), identity revocation, browser private-value boundary and teardown PASS. No service-role call is counted as user authorization evidence. Lint/types/build PASS. Overall CI remains FAIL solely at the unsuppressed 5-high dependency audit (Issue29); dependency review/critical Playwright remain skipped, not passes. Browser bundle scanning does not establish UI visual or interaction acceptance.

## New backend families

| Family | Normal operations | Actual behavior and limit |
|---|---:|---|
| Inbox | 13 | Private internal conversations/messages/self markers, CAS/HMAC replay/current assignment, close/reopen/archive/restore; immutable bounded bodies. No send/provider ingress. |
| Notifications | 5 | Self center, unread/read/all, bounded actual overdue-task refresh and dedupe; in-app opt-out honored. No scheduler/provider. |
| Automations | 8 | Disabled definitions and explicit enable; reliable future customer.created events; registered actual task.create/notification.create only. Unique terminal runs, concurrent processing/replay tested; no arbitrary code/SQL/URL, failed auto-retry or fake pending progress. |
| Settings | 5 | Own display/timezone/locale/in-app preferences; owner/admin business profile distinct from fiscal issuer; current private PNG/JPEG logo. Seven integration classes report truthful not-configured/available-local states, not connection health. |
| Requested reveal | 1 read | Exact requested contact email/phone or customer fiscal ID; role matrix and current entity access; atomic immutable value-free audit and no-store response. Existing human editor contracts are unchanged and must be excluded from generic AI context. |
| Invite expiry / origin | 3 | Expired invitation list/reissue, 7-day expiry, last-owner protection; no delivery/identity grant. New manual origin proof from canonical audit for eight entity kinds. Legacy manual declarations remain unverified; contact has no fabricated source column. |
| Document integrity/cleanup | 4 | Server measures actual authorized Storage bytes, signs private witness and stores immutable SHA256; download rejects corruption. Exact actor/version lease permits only one ≥24h expired pending object, with metadata retained archived. Scanner unavailable and required mode fails closed; active/PDF cleanup retained. |

The document target fix resolves customer ancestry for coded activity without adding a second document target. All six customer/contract/service/line/service_case/opportunity paths have real upload/finalize/ticket/proxy-download positives. Service-target integrity and exact cleanup are also tested. Verification acquires the exclusive document lock before manifest shared locks, preventing concurrent lock upgrades. Old migrations are preserved; the fix is a forward migration.

## Prepared imports, portability and email

EncryptedImportStagingV1 has opaque short-lived authorization grants rechecking real current workspace/actor/job; test-only adapter requires an ephemeral 32-byte environment key, uses authenticated encryption with scope-bound AAD, restrictive filesystem permissions, immutable idempotent writes, digest/ref MAC checks, tamper/revocation denial and exact cleanup. Runtime production cannot instantiate it. CSV is bounded UTF-8 with closed headers, safe row-code errors and formula/control rejection; XLSX/ZIP remains blocked. Real Auth/importjob and cancellation/cleanup proofs PASS_DISPOSABLE_ONLY. No normal upload/validate/apply/resume registration, fake progress, domain mutation or relabeling imported records as manual is claimed. Production KMS/encrypted storage, scoped worker and canonical import-source domain adapters remain necessary.

[product-environment.json](contracts/product-environment.json) lists 34 names with scope, environment requirements, secret classification, validator, purpose and provider class, no values. Validation rejects unsafe public secrets, origins, inconsistent key pairs and production use of the disposable adapter, returning only names/codes. Rebuild uses the canonical migration chain and pinned seed-off Supabase config; actual private bucket policy and disabled Google OAuth are checked. Native PostgreSQL16 and local Supabase PostgreSQL15 are distinct verified paths, not claimed production equivalence. Hosted staging (Issue12), production key install/rotation, offsite backup recovery and live provider delivery remain untested.

Auth SMTP and CRM mail are separate readiness channels; both not configured. A flag or credential alone cannot establish verified sender domain, HTTPS site/callbacks, delivery, bounce/retry or production readiness. No email or provider activation occurred.

## Retained product boundaries

Existing exact billing, transactional numbering/frozen snapshots, protected private PDF, review-only unsaved proposal, bounded reports/search/dashboard, team, portfolio and deadlines remain canonical. Resolve/dismiss/cancel plus a new deadline record preserves history; no invented supersede state. Advanced historical billing analytics and text/audio parsing remain unavailable. Unlinked active PDF objects are retained until a scoped reachability cleanup is proved.

## Handoffs and remaining work

W2: [exact handoff](W1_TO_W2_COMPLETION_20261005.md). W2 branch and UI evidence are owned separately; backend browser/private checks do not promote their parity ledger or ui_safe. W3: [all 91 write and 38 read contracts](W1_TO_W3_AI_CAPABILITIES.md); Issue10 owns durable immutable-intent confirmation, current authorization, dispatch/replay/recovery, no registration here. Sensitive/private bodies, document/fiscal material and import data are excluded from generic AI context.

Issue29 was checked once against the upstream advisory as requested; no known patched version was identified. Package/lock versions and audit enforcement are unchanged; five high findings remain. Issue10 and Issue12 remain open. Next: W2/W4 exact UI acceptance; separately authorized production imports; W3 durable Issue10 closure and upstream Issue29 resolution before production readiness.
