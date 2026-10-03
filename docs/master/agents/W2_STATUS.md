# W2 Product Rebuild 1.0 — delivery status

Date: 2026-10-03. Branch: `w2/product-rebuild-v1`. Draft PR: https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/27. Target: `w4/preview-hardening-v1@6210a9d5af6766679b231954199bc77b07ad8559`, containing W3 PR21 and the W4 candidate launcher/request hardening. This PR is product work; it does not merge main or accept a release.

## Delivered scope

Dense shared shell with responsive modal navigation, safe cross-entity fixture search, eleven module entries and reusable tabs/drawers. Dashboard, Clients, fourteen-area Customer360, seven-tab telecom portfolio, opportunity pipeline/card/list views and real calendar week/month/agenda grids are functional typed read previews. Assistant has temporary threads with rename/delete, safe W3 output, sources/partiality, validated customer context and cancellation fencing. Invoice proposals, reviewed local drafts, real draft PDF bytes, tax/discount/FX editor, customer-scoped entity links and controlled trash lifecycle are functional local operations. Company/fiscal forms remain in memory. Inbox, automation catalog and document categories expose their actual readiness limits.

All data shown by rebuilt modules are synthetic or unavailable. Backend effects and provider sends remain disabled. Frontend roles or fixture IDs never supply server authority.

## Measured capability coverage

The canonical register is `../PRODUCT_PARITY_STATUS.json` (244 rows, matching `../PRODUCT_PARITY_MATRIX.md`). Fully delivered means SYNTHETIC_IMPLEMENTED or LOCAL_IMPLEMENTED **within preview scope**. Partial rows count zero; disabled operations count zero. Platform implementation retained from W1/W5 does not count as new UI delivery. Four explicit property-domain exclusions are outside the denominator. The register mixes inherited capabilities and 31 marked telecom additions, so the scopes are explicit rather than claiming all rows originated in the old CRM.

| Required metric | Value | Definition / limit |
|---|---|---|
| OLD_PRODUCT_PARITY | 47.4% | 99/209 applicable generic historical rows delivered in preview/local UX; live behavioral parity is not accepted |
| TELECOM_SUPERSET | 54.8% | 17/31 explicitly marked telecom extension rows fully functional; remaining additions partial/blocked |
| VISUAL_QUALITY | 80% | 8/10 review checks evidenced: shared shell, heading hierarchy, nine-screen desktop/mobile captures, controlled document width, responsive controls, labelled fields, visible unavailable/partial states and legacy-string absence. Old-rendering comparison and independent human approval remain unverified. This is acceptance-check coverage, not an aesthetic score |
| INTERACTION_COMPLETENESS | 51.6% | 116/225 product UI capability rows fully functional within preview scope; not a count of routes or successful compilations |
| BACKEND_WIRING | 0% | No rebuilt module is wired to an accepted live scoped data/mutation adapter; existing DB/runtime work is preserved separately |
| SYNTHETIC_ONLY | 100% | Every rendered dataset in rebuilt modules is synthetic/local or explicitly unavailable |
| REAL_WRITES | 0% | No server/domain/fiscal/provider writes enabled by this change; local form/draft state is not a real write |
| AI_UI | 52.2% | 12/23 assistant UI rows delivered; live model, context transport, rich entity navigation/continuations and action contracts are incomplete |
| BLOCKERS | Open | Unpatched dependency audit; scoped server identity Issue12; accepted per-module contracts; W3 action boundary Issue10; human visual acceptance |

Counts: 85 synthetic implemented, 31 local implemented, 40 partial, 5 not implemented, 64 blocked, 15 preserved backend, 4 not applicable. Implementation classification is source-based plus executed module journeys; it does not claim exhaustive per-row browser tests. Microphone recognition has not been exercised. Full product parity is **not** declared.

## Executed validation and evidence

Latest tested product code: `badfd676769540d6b43aaaec84aeacb551c8d388`. The final evidence commit changes documentation only.

Local Node24: 141/141 unit and behavior tests, lint, typecheck and production build PASS. Unit evidence includes filters, null versus zero, periods, calendar dates, DST, deterministic invoice calculation/parser, malicious extraction, PDF generation and cross-customer/contract invoice link rejection. Tests and screenshot journeys remain in the repository.

Chromium acceptance: `badfd676769540d6b43aaaec84aeacb551c8d388`, run https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/37128554151: 12/12 desktop/mobile tests PASS without retries, including invoice links, conversation rename/delete, Spanish summary labels, authority rejection and malformed/cancelled output. Production fixture closure PASS; Linux launcher and child/port cleanup PASS. Screenshot artifact: https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/37128554151/artifacts/11275199353. ZIP SHA256 verified after download. The manifest selects 36 captures: nine screens, two devices, two scroll positions.

CI baseline guardrails, secret scan, migration policy, embedded PGlite, native PostgreSQL and Windows launcher passed on run 37128554151. Dependency review and the separate Critical Playwright job are skipped by repository configuration/dependency gating; they are not reported as passes. The dedicated synthetic browser job supplies the executed browser evidence.

CI quality executes lint/types/tests/build successfully but fails `npm audit` with five high findings through one inherited chain: `eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces@3.0.3`. Advisory https://github.com/advisories/GHSA-vfj7-8cjw-p6xm reports no patched release at review time. No audit suppression, gate removal, forced downgrade or unreviewed dependency replacement was used. W4 must approve a compatible mitigation/update before this gate can pass.

Artifacts `synthetic-product-screenshots` and `synthetic-telecom-browser` retain seven days in the Actions run. Large binaries are not committed. The renewed capture helpers wait for temporary toasts, record upper/lower viewport positions and keep responsive overflow checks. `../PRODUCT_SCREENSHOT_MANIFEST.json` records the selected nine-screen evidence, viewport sizes and SHA256.

Local reproduction: Node24, `npm ci`, `npm run preview:dev`, open http://localhost:3107/login and select **Ver demo telecom**. Browser verification: `npx playwright install chromium`, `npm run test:e2e:preview`. Production closure: `npm run build`, `node scripts/preview-production-check.mjs`. In this executor Chromium download returned an empty archive; Chromium ran in GitHub CI instead. This does not affect the Windows/local setup contract already tested by CI.

## Exact integration gaps and ownership

- **W1/W5 / Issue12:** all fourteen candidate privileged readers exist, but the safely injectable scoped server principal is still missing. Actor/workspace arguments must be derived and membership checked server-side. Do not grant authenticated EXECUTE on caller-controlled privileged functions and do not wire a global service-role key. Need accepted factory and operations for contacts/reveal, fiscal identity, global search, CRUD, calendar edits, opportunity expected-close/products/history, invoices/numbering/PDF/storage, issuer configuration, document metadata and Inbox. Local presentation models are not backend DTOs.
- **W3 / Issue10:** preserve the single existing `{text}` READ preview request and AssistantResponse. Need accepted transport for selected entities, persisted/renamed/deleted threads, rich entity blocks and closed navigation, choices/continuations, stream protocol, live model and authorised actions. No model can emit a fiscal invoice from these local drafts.
- **W4:** review exact-head production fixture/SSR/RSC closure; unknown/malformed replies; stale response cancellation; local draft and issuer isolation; protected identifiers; missing/partial/denied semantics; desktop/mobile focus and scroll behavior; absent provider effects; and the unresolved npm audit gate. Candidate local Supabase evidence and inherited release manifests are not live UI acceptance.

## Explicit remaining product gaps

The missing backend does not excuse reporting a route as a complete capability. Financial analytics, fiscal customer snapshots, real invoice lifecycle, full tariff/stage catalogs, authorized reveal, team administration, notifications, persistence, file operations, provider Inbox and active automation execution remain incomplete. Profile, billing subscription and Reports have honest unavailable states rather than copied sample finances. Old/new code review and exceptions: `../PRODUCT_OLD_NEW_REVIEW.md`.

CAN_MERGE / CAN_STAGE / CAN_PRODUCE: no acceptance claimed. Old reference and main remain unchanged. No deployment or real commercial data/provider effects performed.
