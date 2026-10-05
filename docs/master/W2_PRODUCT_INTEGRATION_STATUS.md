# W2 Product Integration 3.0 — current evidence

Delivery branch: w2/product-integration-v2. [Draft PR30](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/30) remains stacked on w2/product-rebuild-v1@2878687ceb55c4696efc734553d3b87c8f190e72. PR27 is unchanged. W1 executable f574b0c55951e6e357e4e91059fcfe64b1410b02 and documentation94c20dccd342dbf313fe2930b5a3b32b73f61f7d are preserved by normal merges. Main, deployment, production and the historical repository remain untouched.

## Validation and exact heads

Last fully accepted product-browser source checkpoint:a04316133974823ce44eaeb7a9a42997d1d44af9. Supabase54/run37327531623 passed39/39 browser groups,801 W1 backend checks, teardown and browser private-value boundary. CI333/run37327531637 passed lint, types,246 Node tests, build and independent security/migration/native fresh+restore/embedded/preview/Windows checks. The enforced full npm audit retains five inherited high findings tracked in Issue29; dependent Critical Playwright/dependency review are skipped.

250adfef067134ea85f666fcd814d1071923a766 / Supabase53/run37325418835 preserved33 prior groups but timed out in five new cases. The explicit contract-customer accessible label and refresh of fiscal configuration before reopening corrected the blockers. All five then passed at a043161, along with authorized issuer presentation and ten-family/critical-dialog captures at1440/768/390px. This document-only checkpoint retains a043161 as its source-validation authority.

## Modes, identity and data

Synthetic preview uses only fixtures and temporary drafts. Integrated local requires PRODUCT_LOCAL_INTEGRATION, PRODUCT_LOCAL_SYNTHETIC and PRODUCT_V1_ENABLED, a nonproduction runtime and canonical loopback Supabase/application URLs. SSR cookie getUser and current database membership supply identity; the local integration permits synthetic@example.invalid identities only. Document/private-PDF content additionally requires PRODUCT_DOCUMENT_CONTENT_ENABLED. Invalid mode configuration never falls back to fixtures.

The central cookie transport reuses exact closed W1 input/output parsers. Logical retry preserves the command UUID and immutable payload in mounted memory; edits use the actual version read from the database. Contact PII is absent from local/session storage, URL, telemetry and global caches. Integrated writes persist in a real disposable Supabase database despite all data being synthetic.

W1 capabilities remain ui_safe:false. Positive local consumers do not grant W4 staging, release or production acceptance. Integrated assistant sending is disabled pending W3/Issue10.

## Coverage and parity

At the accepted a043161 checkpoint,89/90 distinct operations and67/67 writes have positive browser evidence: BACKEND_WIRING98.9%; REAL_LOCAL_WRITES100%. The unused invoice.summary read is excluded; existing list/get already support the consumer. Exact operation names are counted from safe actual HTTP observations and passing UI/DB behavior, never inferred from family coverage. This does not mean complete behavior, negative-case coverage per widget, full parity or release acceptance.

All244 parity rows preserve separate preview and integrated evidence/limitations. Positive operations are not complete-row or release acceptance. Frozen preview scores remain OLD_PRODUCT_PARITY47.4% (99/209), TELECOM_SUPERSET54.8% (17/31), INTERACTION_COMPLETENESS51.6% (116/225), AI_UI52.2% (12/23). SYNTHETIC_ONLY100% describes the data; production integration is disabled. Visual quality remains partial: ten families and critical dialogs were captured at three widths and real PDFs rendered with Poppler, but human visual comparison remains pending.

## Product families

- Customers/contacts: actual create/update/archive/restore, primary replacement, reload, authorized assignment, stale CAS, JWT membership revocation and PII nonpersistence passed. Imported facts and archived edits remain guarded. Full paginated collections and complete assignment selection remain partial.
- Customer360:14 areas, protected company/contact, and customer-bound calendar/documents/billing entry points. Complete related inventory and transversal activity remain missing.
- Calendar: actual task create/complete/reopen/start/update/cancel (including cancelled reopen), priorities/assignee; meeting create/reschedule/update/complete/no-show/cancel; renewal update/resolve passed. Bounded93-day/100-item results are visibly partial. Coincident weekly meeting cards occupy separate columns. Generic customer association, provider sync and drag remain missing.
- Opportunities: actual manual create/update/neutral-stage change/win/reopen/lose/assign/archive passed. Closed facts are read-only, except explicit won/lost reopen. UUID stage catalog and existing currencies are preserved. Complete inventory, new links and drag remain partial.
- Portfolio: actual manual service/line/renewal creation, renewal update/resolve and imported read-only provenance passed. Contract create/assign/activate/cancel, child label/transitions, permanence lifecycle and renewal dismiss passed through actual UI/database behavior. Active-parent checks use authorized reads and W1 rechecks; full inventory/operator/plan catalogs remain missing.
- Import management: actual existing-job list/get/cancel passed. Upload, validation and apply remain blocked by the encrypted staging adapter; there is no plaintext substitute.
- Billing: actual customer fiscal profile, draft/create/edit/issue/server numbering/payment/reversal/trash/restore, display PDF and frozen private download passed. Actual issued/paid private PDF bytes stay identical. Issuer editing, text proposal with requires_review/no save, and optional storage-failure recovery passed. The real disposable bucket rejected PDF while the invoice stayed issued; after restoring its MIME policy, explicit private conservation/download passed without changing the issued/paid count. Financial issuance is separate from optional document conservation; retries must not reissue. New links, charts/top clients, complete FX/series ergonomics remain partial.
- Team: actual list/role/suspend/resume/invite intention/cancel/remove passed, with owner/self/admin safeguards. No invitation delivery. Existing intent lists, expiry and pagination remain missing.
- Documents: actual metadata/read/archive/restore, prepare/upload/explicit finalize/private download passed. Archiving revokes an issued ticket; actual32-second elapsed expiry denies bytes; a fresh retry downloads successfully. Scanner/hash attestation, inline preview and cleanup remain unavailable.
- W3/remaining families: typed closed refs and presentation/proposal/progress/cancel handoff exist. Durable threads, streaming and provider semantics remain W3/Issue10. Unpublished Inbox work is not consumed or counted. Inbox/automation/notifications/profile/subscription/reports retain explicit backend or consumer gaps.

## Top10 remaining

1. Review complete behavior/negative-state evidence per parity row after the39-group passing regression.
2. Independently inspect the captured critical dialogs and ten screen families for human visual QA.
3. Authorized paginated customer-bound collections and complete inventory.
4. Operator/plan/responsible selection with immutable ancestry-aware links.
5. Broaden attachment conflict/revocation and financial state UX from the accepted private-PDF recovery baseline.
6. Browser dictation availability/privacy, financial charts/top clients and FX/series ergonomics.
7. Accepted Inbox, automation and notification backend contracts/consumers.
8. W3 durable-thread/stream/proposal contracts.
9. Document scanner/hash/preview/cleanup and encrypted import processing.
10. W4-reviewed Issue29 mitigation and release acceptance.

## Next3

1. Review per-row completeness from exact accepted UI/DB behavior without weakening W1 authority.
2. Reevaluate individual parity rows from accepted behavior, preserving negative-role/CAS/provenance limits.
3. Publish coherent checkpoints and update PR30/W3 handoff with exact-head evidence and remaining blockers.

## Execution limitation

The local executor lost the checkout backing directory and disconnected. Important work was reconstructed and published through GitHub; fresh remote CI provides execution evidence. Screenshots/PDF renders remain available as CI artifacts, but local human visual inspection is blocked. No completion or production readiness is claimed.
