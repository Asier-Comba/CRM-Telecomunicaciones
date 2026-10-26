# Work59 · F5 initial report read

Product baseline: `3e98b55aec0ab38c3a17974927ec43afd3678b87`.
CLAIM: issue67 comment6415787134. Changes are confined to this folder and own evidence/documentation.
No W2 source, fixtures, original acceptance scripts or shared configuration changed.

This compiles actual `IntegratedReports`, `ProductProvider`, repository and closed DTO parsers.
Only HTTP is synthetic, intercepted by Playwright. The existing W2 TypeScript loader is reused read-only.
No Auth, DB, Next router, SSR/hydration, real RLS or hosted acceptance is claimed.
No business commands are allowed; each test asserts zero commands. A fresh export denial must produce no download.
The known in-flight export issue proposed in #185 is outside this initial-read unit and remains excluded pending ACK.

## Run

Install the exact lock dependencies and the matching Chromium in an authorized local directory.
Executed here with Node24.20.0, Playwright1.61.1, Chromium149.0.7827.55/revision1228, Europe/Madrid, workers1, retries0.
From the repository root, in PowerShell:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = '<authorized browser directory>'
$env:ASIER59_OUTPUT_ROOT = '<new authorized evidence directory>'
$env:ASIER59_ATTEMPT = 'attempt01'
node node_modules/@playwright/test/cli.js test --config tools/asier_reports59/playwright.config.mjs
```

Use a NEW attempt number. Existing output folders are refused in the runner; worker config reloads are allowed.
Default output location is the task's existing `outputs/Integration-2026-10-26/unit59` directory.
The complete current matrix has31 tests, with3 deliberate RED assertions and28 positive controls.
Exit1 is expected when running the deliberate RED cases; neither `test.fail`, retries nor skipped assertions hide them.
The helper's original5-second assertion and every F5 assertion are unchanged.
The helper's second invoice-summary closure is outside this unit and is never counted PASS.

Use `--grep 'RED original'` for the three pending-read counterexamples.
Use `--grep 'late month|actual ProductProvider|loaded previous|URL period'` for context/period controls.
Use `--grep 'original F5 immediate'` for the original F5 flow with immediate dashboard responses.
The original F5 helper itself later resizes to all three widths; initial mount additionally starts at390/768/1440.

## Observable sequence and boundary

At390 in attempt02: dashboard request402ms → original assertion fails5471ms with request pending →
headers5678ms → validated DTO5820ms → export enabled5832ms. Same held request is released; no retry or write.
The3 negative cases preserve the original failure and capture before/after release.
Auxiliary report readers can stay pending while the dashboard alone enables CSV: this is independent of Cartera's reference batch.
Immediate and1500ms first reads complete the unchanged F5 flow;503/invalid DTO/403 fail closed.
Period and real Provider actor/workspace/role changes discard old responses; loaded old counts disappear while the new scope loads.
Customer selection belongs to the Telecom child report and does not silently alter the global dashboard contract.

This proves a controlled pending-read mechanism, not why run40307021660 was slow.
That run's32 dashboard200 entries have no F5 phase/request correlation. A later loaded screenshot cannot supply it.
`observe-initial-read.mjs` is a passive, bounded, loopback-only candidate for W2 to attach to the existing real F5 check after ACK.
It reports phase, script status, request sequence/period/audience, HTTP status, body validation and relative time;
it never records request bodies, user/workspace IDs, headers, URLs, DTO values or exception messages.
It changes no request, timeout, retry or assertion. It does not itself identify hydration/React render completion or an epoch discard.

## Comparison and preflight helpers

`compare-sources.mjs <output.json>` reads exact Git blobs and the three existing safe artifacts in the task output folder.
Artifacts: acb70a6 run40302666528;3e98b55 run40307021660;d9799f66 run40307623720 attempt2/artifact12647346481.
It is an evidence assembler, not a new acceptance suite. An independent clone must first place those artifacts in the documented task paths.
`preflight.mjs <output.json>` calls the existing platform preflight with only synthetic inputs.
Even a syntactically valid synthetic digest must remain BLOCKED; it is never presented as an artifact or W4 approval.
Neither helper contacts the denied Netlify origin or an external database.

Preserved attempt history:01setup control1PASS;02full28=25PASS/3RED;
03own config reloaded inside a worker,1setupFAIL/6not-run (not a product failure);
04seven strengthened stale-response controlsPASS. Further exact-commit runs are recorded in the handoff.
