# Work59 · characterization delivered; product acceptance remains partial

CLAIM59: issue67 comment6415787134. Product source3e98b55aec0ab38c3a17974927ec43afd3678b87/tree0bc5af06824b7d605b5993c022221f53ab1be13e.
Own branch `codex/reports-initial-read59-20261026`; PR191 remains frozen. W2 components, fixtures and harness untouched.

## Executable increment and result

`tools/asier_reports59/` compiles actual IntegratedReports, Provider, repository and DTO parsers, reusing W2's loader read-only.
Only HTTP responses and Provider identity props are synthetic. No Auth/DB/SSR/Next router acceptance is claimed.
The unchanged original F5 closure is invoked with all assertions, including scope, period, fresh CSV,503, retry and mobile.
The second invoice-summary closure is outside this unit and is not counted as tested.

Attempt01:1 immediate F5 controlPASS. Attempt02:28 controls,25PASS/3deliberateRED,0skip/0retry.
The RED cases preserve the original5-second assertion failure, then release the SAME request and capture loaded state.
Attempt03:own output preservation guard rejected worker config reload:1setupFAIL/6not-run, retained separately.
Corrected only the own guard using Playwright's existing TEST_WORKER_INDEX; attempt04:7 strengthened stale-response controlsPASS.
Lint of own files and complete TypeScript check PASS. No product build or real Supabase suite was repeated.
Final exact-commit verification and remote SHA are supplied by the subsequent GitHub handoff to avoid self-referencing a commit hash here.

Controlled390 sequence, relative to observer start:

| Event | ms |
|---|---:|
| Original reports:initial_read starts |36|
| Script request / response200 |81 /180|
| Dashboard request |402|
| Original assertion fails while request remains pending |5471|
| Headers200 after manual release |5678|
| DTO validated |5820|
| Export button enabled |5832|

The same sequence was observed at768/1440. No retry/query reconstruction/business write is needed for recovery.
Immediate and first-read1500ms responses complete original F5. Keeping unrelated readers pending does not prevent CSV enabling.
This independently reproduces a pending dashboard mechanism; it is not Cartera's Promise.all reference batch.
503/invalid closed DTO/403 export denial fail closed. Bad bootstrap has0dashboard requests and no report button, unlike the loaded-later case.
Period/month→all, URL initialization, real Provider actor/workspace/role changes ignore stale responses.
The strengthened cases wait for observed old-body validation and browser render turns before asserting absence.
Customer selection changes the Telecom child query, not dashboard.get, whose contract has no customer_id.
Three additional controls cover an already-loaded previous scope becoming unavailable while the new scope loads.
The current complete own matrix contains31cases:28positive and3deliberateRED. Nothing is promoted to real Auth PASS.
Known in-flight download cancellation in proposal#185 remains outside this initial-read scope and excluded pending ACK.

## Real F5 cause and W2 handoff

Real run40307021660/job121518538042/attempt1 failed reports:initial_read after12802ms overall; its screenshot later shows a loaded report.
The artifact has32dashboard200 entries without per-F5 request/body/phase correlation. It cannot identify whether the initial read was pending,
delayed by Next compilation, invalid, discarded, or followed by a later render. No exact CI cause or minimal product fix is asserted.
The controlled missing-response negative is intentionally not called a product regression: no data means no authorized export.

Deliverable: passive `observe-initial-read.mjs`, loopback-only and bounded to96events/12dashboardreads.
It records original F5 phase, script status, request sequence/period/audience, HTTP status, DTO validity and relative times.
No request body, ID, header, URL, DTO values or exception messages enter its snapshot. It neither retries nor changes assertions/budgets.
An optional existing report target preserves W2's action/error metadata through the Proxy.
W2 is asked for ACK to consume this observer around its real F5 helper, retaining the original timeout and failure artifacts.
Only after real correlation should the owner change loading/rendering/scenario code; no speculative product patch is delivered.
W2 also still owns the exact original Cartera diagnosis and selective fix/ACK. Repro58 is reused, not duplicated.

## Three exact sources kept separate

See `evidence/unit59/SOURCE_COMPARISON.json`: Git blobSHA256, tree, lock versions, complete per-check order/results/timing.

| Source | Tree | Migrations | Next / Zod | Real Auth browser | Run |
|---|---|---:|---|---|---|
| acb70a692c7ccc07421c27f8815a9f2a91287232 |90954e20d08beb5db24b29aa375c8d651f0dfbb6|87|16.4.3 /4.6.7|115/116|40302666528|
|3e98b55aec0ab38c3a17974927ec43afd3678b87|0bc5af06824b7d605b5993c022221f53ab1be13e|87|16.4.3 /4.6.7|103/116|40307021660|
|d9799f6610c9841528040c6437f3a51cea4ee386|18cb677191e9610bbc1ef81b3c004d259fb4b048|88|16.3.8 /4.4.3|116/116|40307623720 attempt2|

acb→3e98 changes4files: own docs, onboarding cleanup and its regression. No browser product/harness/lock/SQL change.
Across all3, portfolio/report/Provider/repository/parser/F5/current-reference/billing-uncertain blobs are identical.
The browser script suffix from `async function check` through scenario order, Auth/fixture restoration and cleanup is byte-identical.
All116 recorded check names have the same order. React19.2.4, Playwright1.61.1, SSR0.10.2 and supabase-js2.105.3 match.
The W5 branch injects its server-only service key before the shared suffix, changes Storage fixtures/reader and migration88,
and uses the older workflow without the OS-package cache. It also differs in onboarding and billing files unrelated to the unchanged F5.
Random synthetic identities and runner resources are not proven identical. The same-context fixture reuse is shared across these runs.
On failure, the existing shared catch screenshots then navigates to page.url(), clearing in-memory selection: this explains a dependent
selection-reset mechanism, but not the initial Cartera failure. No change to that W2 catch is made.

| Scenario elapsed ms (whole check) | acb |3e98|W5|
|---|---:|---:|---:|
|Cartera first|15670 PASS|7277 FAIL|12023 PASS|
|F5 Informes|11654 PASS|12802 FAIL|8804 PASS|
|Documents target|7103 PASS|32902 FAIL|11809 PASS|
|Billing lost receipt|9094 FAIL|20010 PASS|13057 PASS|

Whole-check duration is not the internal5-second assertion duration. All3 record a normal server exit0 at cleanup;
that does not prove absence of individual slow reads, cold compilation or runner contention.
W5 safe artifact12647346481 is independently downloaded and verified:
sha256 c62799068c76918bf89791e9048b418b666bb843f70cb0587be997f04c3c7931.
Its own evidence SHA42fc8c18f0f33c8e0b5c3fed2486a557a1e94682 is retained, not overwritten with headSHA.
W5 attempt1 cancellation at35min is retained per owner handoff6415557207; only attempt2 passed.
No three-suite rerun, source merge, shared-cause claim, or Storage88 consumption occurred.

## All13 original failures remain FAIL

|Failure|Observed boundary / dependency|
|---|---|
|F0 Cartera manual|Reference search/get valid; card absent. Pending-batch mechanism reproduced58, original second reference/cause unknown. W2 blocked.|
|F1 Calendar renewal|RENEWAL_FIXTURE_MISSING afterF0 failed creation.|
|F2 Service/line labels|COMMAND_FAILED step5; absent service lookup may reach line SQL before UUID guard. SQLSTATE not retained, not asserted.|
|F3 Permanence|Timeout step1 after failed-check navigation clears selection. Controlled reset reproduced58.|
|F4 Billing exact|BILLING_REAL_RELATION_FIXTURE_MISSING after service relation was not created/renamed.|
|F5 Reports|Independent; new controlled sequence above; original CI cause unproved.|
|F6 Opportunity links|LINK_SERVICE_FIXTURE_MISSING afterF0/F2.|
|F7 Document drag|Timeout selecting service target renamed inF2; invalid drop was never reached.|
|F8 Customer360|C360_ADDITIONAL_INVENTORY_FIXTURE_MISSING; no renewal fromF0.|
|F9 Case create|CASE_RELATION_FIXTURE_MISSING; service/line join absent.|
|F10 Case lifecycle|CASE_FIXTURE_MISSING afterF9.|
|F11 Private case notes|CASE_FIXTURE_MISSING afterF9.|
|F12 Case viewer|CASE_VIEWER_FIXTURE_MISSING afterF9.|

Dependencies explain preparation boundaries, never waive failures. No writes are replayed or fixtures rebuilt here.

## Security and independent acceptance

#191 remains real browser103PASS/13FAIL, backend4042PASS, preview940fixtures; CI40307021900 and native87 PASS.
W4_ACCEPTED and W5 confirmation of191 remain pending; W5 Storage handoff is not191 approval.
Review request191 comment6414943401 covers Next/Zod, lock/SBOM, onboarding cleanup,87migrations/RLS/grants, auxiliary scans and exactSHA.
All-ref40307021645 has28pattern matches/447refs/1653commits; public artifact12642623357 is aggregate-only.
No locations or classifications can be reconstructed from that artifact. W4 must use the authorized private report channel,
classify without posting secrets/metadata to the public repository, and independently accept or reject the exact source.
Auxiliary images remain n8n93HIGH/13CRITICAL and Postgres25HIGH/1CRITICAL; app scan itself passes.
Repository is PUBLIC. Owner must confirm intended visibility; no visibility change is authorized or performed.

## Staging verification without deployment

Existing40admission tests and10platform config/operations tests PASS,0skip/0fail.
Existing staging-evidence selftest:1valid synthetic schema control +8negative casesPASS;
release-gates selftest:1consistent document +5negative casesPASS.
Existing validators report no staging evidence and release1/9gates/blocked. Their selftests are not hosted acceptance.
Own `preflight.mjs` invokes the existing validator only:missing digest,synthetic digest,wildcard cohort and production target allBLOCKED/no mutation.
`evidence/unit59/STAGING_PREFLIGHT.json` contains names/status/codes only, no deployed values or synthetic digest value.

Source/config hashes and CI image provenance remain in checkpoint58/STAGING_PREPARATION_ONLY.json.
App imageIDsha256:ce6b8cff8c0c219e6597767638eff6614a6a0816f9f5010b0b917ebba75bd289 is LOCAL CI identity,
not a published manifest, Netlify build digest, accepted deployment artifact or portable rollback.
No new hosted build digest exists. Effective adapter/integrity, deployID/artifact digest, accepted old deployID/config snapshot,
account quota/no-cost capacity and current service health remain NOT_OBSERVED.

Repository contract:netlify.toml builds `.next` with npm run build; Node comes from.nvmrc, plugin is unpinned.
Netlify's [current official adapter documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
states support for modern Next/App Router/route handlers and recommends automatic adapter updates.
This supports evaluation, not acceptance of the unseen site adapter or its Node Proxy behavior.
Record the effective adapter and exact output at an authorized future build; do not add a legacy pin.
Public bindings include Supabase URL/public key and approved UI flags; service-role, cohort and verifier material stay server-only.
The unchanged source admission demands production build +declared staging +exact origin/project +canonical cohort,
with fresh getUser validation, no editable-metadata/getSession fallback and no local synthetic escape.
The existing40tests verify those boundaries without contacting staging.

Browser origin denial stays intact. Human action:Settings→Browser→Agent permissions→allow only
`https://crm-telecom-staging-preview.netlify.app`; if policy is locked, organization admin must amend that exact-site rule.
Then owner signs in personally if Netlify requests it. Team Protection remainsON. No alternate client/profile/HTTP/CDP bypass.

Future authorized smoke must observe exact deploySHA, authentic approved owner login, each CRM screen, synthetic tenant separation,
confirmed record reload/readback and safe logout; invoice draft363EUR only under explicit synthetic write scope.
No new Auth accounts/cohort or Storage migration are implicit. Rollback means restoring a previously accepted deploy artifact/config,
then rechecking admission/health/read-only smoke; no reverse SQL or automatic restoration of a protected Arizan source.

Deployment gate remains closed for W2 integration/Auth116, W4/W5, history/image security, source/artifact binding, quota and owner approval.
No Netlify/EasyPanel/Supabase staging change, migration88, IA live/write, cost, main/forcepush or Arizan change occurred.

## Next three executable units

1. W2 consumes passive observer after ACK, correlates real F5 and original Cartera reference, supplies minimal fix +before/after evidence.
2. After exact delivery/ACK, compose selectively, run causal/dependent journeys then full acceptance on the new exactSHA; retain failures.
3. W4/W5 exact191 review and owner exact-origin permission/visibility/quota decisions; then prepare authorized hosted verification, not deployment by silence.
