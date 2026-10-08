# W2 — Document upload consumer receipt

Owner: W2 browser acceptance. Base: composition `0fa8864928074e86a40cdc38707111df7f1f7060`, PR #38. Candidate requires a fresh complete real Supabase run; this document does not declare acceptance.

## Reproduction and cause

Run `37853702382`, job `113572886927`, executed merge `a128066ce19b943b97f6114186e2cb7e0c6d90cb` (tree `ebb194a7461a8dcb523e05083dfdf1f8de632c8c`, identical to the source base). Auth returned 200. Backend checks were 3409 + 227; persisted history scope/replay/CAS/revocation and the cookie thread API passed. W2 was **106/107**, with only `document_real_target_drag_invalid_no_request` failing at `document_drag:upload` with TIMEOUT. Teardown passed. The failure screenshot already contains “Archivo subido; pendiente de finalización.” and an enabled finalization control. The report includes a real HTTP 200 upload. These observations prove the closed check can fail despite eventual completion; they do not measure exact latency or prove the whole suite.

The consumer clicked upload and immediately asserted the rendered result. `page.setDefaultTimeout(30000)` governs page operations including `waitForResponse`; it does not override Playwright's default 5000 ms `expect` budget. Installed Playwright 1.61.1 defines this separately in `playwright/lib/matchers/expect.js`. Earlier references to a generic 30-second timeout must not be interpreted as a 30-second assertion timeout.

## Change and consumers

Both existing upload journeys now register the actual response before each preparation/upload/finalization click. The same command must return HTTP 200, an exact successful envelope and the existing closed receipt. Upload must return the prepared document ID, `uploaded:true`, `finalized:false`. Finalization must use the prepared version and pass the existing receipt parser's ID/command/version/status binding. Only after the real round trip does the unchanged visual assertion run.

Budgets remain 30 seconds for page operations and 5 seconds for visual assertions. This intentionally separates network completion from rendering, allowing the existing network budget before the existing render budget. There are no retries, sleeps, response mocks, timeout increases, removed journeys or weakened permission/CAS/idempotency rules. The report records only upload status and elapsed header/body milliseconds, never IDs, URLs, file contents or credentials.

The invalid HTML drop now additionally observes zero content POST requests during its validation/disabled-button check. Existing real Storage download bytes, revoked/expired ticket denial, finalization, service linkage in SQL and reload checks remain. App components, API handlers, RPC contracts, Auth, migration order and W3 history implementation are unchanged.

## Validation and remaining gates

- Windows Node syntax: PASS.
- Changed script ESLint: PASS; using the installed adjacent ESLint runtime with its explicit config emits a React auto-detection setup warning because this isolated worktree has no React installation. No code warning/error is suppressed.
- Existing document contract/service/transport tests: **4/4 PASS**, zero skips.
- Full local stack/build: not run for this script-only change. Windows memory remains below the documented full-stack requirement; existing Docker remains stopped. CI must run lint/types/tests/build and actual Auth/PostgREST/Storage/browser acceptance on this source.
- 107/107 on this candidate: PENDING, never inherited from passing W2-only PR #37/#41. The full composition remains 106/107 until fresh evidence closes it.
- Full dependency audit remains blocked by issue #29 (five HIGH); physical assistant business durability and independent W4 approval remain pending issue #10. AI business writes remain disabled. No W4/W5 infrastructure or production change.

Next: collect actual candidate upload timings and full integration; consume the isolated change into W2/W3 only after reviewing its diff and evidence; diagnose any remaining independent browser failure before declaring compatibility.
