# Documents Pro V2 — D1A scoped frontend checkpoint

## Recovery / D1 source-gate increment — 2026-10-28

Remote refresh confirmed #198 ddcd9ea, #199 37d48e9 and #200 8cc9adf (tree f2ed1b83586553e75cb57237ba153712c5725dc0), with no later D1 source. Retained local global UI3337d4cad727b0ef62815b32935fd51e33081d82 is present and committed; it is not rebuilt or credited as Auth acceptance. #200 native PostgreSQL122343835125 and embedded122343837068 passed in CI40548021775, closing the index regression physically for that source. Supabase40548021789 is SUCCESS; global Auth/UI remains unaccredited. The rest of the original CI remains FAIL, not inherited by this increment.

This increment fixes source compatibility without changing SQL: explicit BASE87_PLUS_D1 manifest pins the two historical manifests and the corrected D1 SHA256/blob/source8cc/tree. Strict85/86/87 loaders remain unchanged and reject D1. Explicit historical projections validate all88 files first, then expose only exact86/87 pinned SQL; new consumer modes have no count inference or fallback. Native workflow selects historical87 and full D1 separately, while both86 workflows explicitly select their historical scope. All old unknown/missing/modified negatives remain and D1 adds same-count Storage88-substitution, altered/missing SQL and source-selection rejection.23 focused profile tests PASS locally; physical committed restart for this new source is pending.

Five bootstrap failures at8cc were D1-caused: two obsolete assumptions that the actual checkout is profile87, missing bootstrap migration name, and two public-catalog assertions affected by a regex truncating private_schema.object into a fictitious public relation. Historical87 tests now use an exact87 fixture, with strict D1 rejection separately enforced; no criteria are relaxed. Namespace recognition consumes qualified/quoted names before selecting public scope; private function grants remain checked independently by existing domain/SQL gates. Seven audit checks PASS. W4/W5 technical ACK delimited inventories: only D1 filename/hash, optional server-only defaultOFF flag and new endpoint consumer references for PRODUCT_V1_ENABLED/ORIGIN. Prior87 inventory entries and public allowlist remain unchanged. Actual regenerated diff and adapters still require independent review.

Recovery CLAIM6465703344. D2 is now a human product objective but shared ownership/contract remain to be agreed before SQL/backend edits. No Storage88/#179, main, staging, hosting, private bytes, live AI or costs enabled. RELEASE_NOT_ACCEPTED.

The existing composition generator also requires its source inventory to include D1: W5 reviewed precisely head.migrations87→88, one forward filename and public_rpc_manifest319→320. Its historical sources and composition_accepted:false remain untouched. Inventory and composition checks PASS after those exact changes. Local lint/typecheck/production build and5 contract checks PASS. Broad Windows bootstrap:678PASS/5FAIL (683 total), all five failures in unchanged encrypted import adapters rejecting local filesystem prerequisites; assistant stage was not reached because of the existing &&. These failures remain FAIL, not waived. Linux exact-source CI must validate the complete suite. No migration SQL or privilege entry changed in this recovery increment.

2026-10-27. Base: integrated commercial B43 `b43f459e8ee26e5d684206842e5acb377b364875` (#191). This is a partial checkpoint, not D1/global inventory acceptance or a release.

## Delivered

- Actual existing `document.v1` target inventory, responsive table/cards, explicit metadata/context actions, active/archive filter and cursor navigation.
- Reload preserves target/status/page/cursor. Previous-page history is bounded and scoped to actor/workspace/role/query; a cold link can return to the first page. No local document cache.
- Changing the record-selection query retires an older pending search result. Refresh withdraws old rows immediately; denied/unavailable are distinct from an empty result.
- All 123 synthetic documents of ONE target traversed through seven actual component pages, without duplicates or a fanout reader. This does not demonstrate workspace inventory.
- File formats/sizes use approved metadata. Original name/date, global file search/sort/counts and folders are explicitly unavailable. A cold customer link currently uses the generic customer context label and a validated local customer link; it does not invent a customer name.
- Existing byte/maintenance feature gates remain unchanged. No PDF preview, new private byte enablement, API/DTO/RPC/RLS/SQL or shared repository changes.

## Verification before source commit

All results below refer to this checkpoint's source files; the source commit is recorded in the PR/issue handoff rather than embedding its own hash.

| Evidence | Result | Boundary |
| --- | --- | --- |
| Own navigation unit tests | 5 PASS | Actual pure navigation helper |
| Own browser `d1-ui-final` | 8 PASS | Actual React/components/repository, controlled HTTP; not Auth |
| Existing document browser `d1-legacy-01` | 29 PASS | Existing assertions retained; controlled HTTP |
| Typecheck / targeted lint / production build | PASS | Local Node 24, Next 16.4.3 |
| Visual inspection 390/768/1440 and mobile drawer | PASS | Loaded synthetic inventory; isolated component shell, not full authenticated CRM |
| Auth/Supabase new checkpoint | NOT_RUN | To be executed on an explicitly disposable runner |

Before/after evidence is retained outside the public source tree under `outputs/Documents-Pro-V2/`: `d1-before-02` has two expected failures using the exact B43 IntegratedDocuments blob (other fixture dependencies are current). Page 2 reload returned document 1 rather than 21; a completed old search remained visible after the query changed. `d1-before-01` is a separate fixture preparation failure (React resolution), not product red evidence. `d1-ui-01`, `d1-ui-02` and `d1-ui-final` are separate retained runs, not retries hiding failure.

Original disposable acceptance selectors were changed mechanically from article containers to document identity attributes: five locators in product-browser-acceptance, one in maintenance and two in settings-sensitive. No operation, assertion, order, retry or timeout changed. This scope was claimed in #67 before editing. Full existing acceptance is still required on the new source SHA; B43's 116/116 is not inherited.

## Ownership / blockers

Documents frontend CLAIM: #67 comment 6441326480. Backend proposal and W1 handoff: comment 6441788960, `D1_CONTRACT_PROPOSAL.json`, proposal commit `f1d452b9b1e5a06c94aeec99324d901b4718b458`.

W4 and W5 found no identified active W1 or verified backend delegation. A direct owner question is pending. No backend agreement is inferred from silence or technical review. Global inventory, approved title/date visibility, cursor policy/search/sort and persistent folders remain BLOCKED_W1_AGREEMENT. A folders migration is not being fabricated in frontend state.

W4 has reviewed the proposal only, not accepted this UI or a release. W5 requires the concrete isolated QA helper/workflow before its technical review. Neither substitutes W1. #179 remains unmerged and its hosted Storage/cache security gate is not accepted. Staging migration 88 was reported applied under independent W5 authorization; this branch retains the canonical 87 migrations and does not touch staging.

Repository remains PUBLIC; visibility is an owner decision. No sensitive findings, filenames, credentials or captures of real data are published.

## W4 review correction after 9c41e76

W4 identified two P2 findings on the published source: three additional article-specific identity selectors and a preview left mounted after browser history changes the target. The new controlled tests reproduce both loaded-image and pending-byte variants: `d1-w4-before` 2 FAIL on the uncorrected component, then `d1-w4-after` 10 PASS after retiring contextual panels in both navigation paths. The loaded blob is revoked; late bytes never create a blob. The content flag is stable in the isolated fixture, matching a real fixed server feature flag. No private capability is newly enabled.

Three more mechanical selectors now use identity attributes, retaining document IDs, versions and assertions. CLAIM #67 comment 6442983558. Original source run 40510814220 remains attached to 9c41e76; it is not a retry of the corrected source. The next original suite execution is justified by these explicit findings and must retain its own source/results. Independent W4 review of the correction remains pending.

## Original real acceptance on e20ecfd

Run 40512743954 / job 122218890758, actual checkout `26194e27b993daab138e371e8839738c1f4e927d` (same product tree), finished FAIL: 115/116 browser scenarios, 3815+227=4042 backend checks PASS, 87 migrations, teardown PASS. Exactly one browser failure: `document_real_target_drag_invalid_no_request`, at `document_drag:reload_truth` (TIMEOUT). Upload/finalization and the persisted service-document count of one had already succeeded. The final assertion still used `getByRole('article').toHaveCount(1)`, while documents now render rows.

The next correction changes only that remaining document container locator to `[data-document-id]`; the count of one, SQL readback, actions, ordering and time budgets are unchanged. Application source is unchanged from e20ecfd. Do not credit the 115/116 run as PASS or inherit a later result. W4 independently closed the earlier two P2 findings on e20ecfd with limited technical ACK; no W4_ACCEPTED/release approval. The original 9c41 run was cancelled automatically by workflow concurrency after the causal correction push (60 completed PASS events observed, no final summary); it remains CANCELLED.

## Verified baseline and owner-delegated global D1

#198 head ddcd9ea45cb66b2ec6ad0ffa9b1fba43ec3cab7d / actual checkout58938f1e7a36b97e2e99b66ecd90a73faab1f09b: CI40516871471 PASS, real Supabase40516871220/job122232851141 PASS116/116,4042backend,87migrations,teardownPASS. Earlier115/116 remains FAIL. All-ref/vendor-image gates remain FAIL; no release.

The owner explicitly delegated ONLY backend D1 proposal f1, subject to independent W4 review (CLAIM6446243091). Global reader implementation is on a separate branch; D2 folders are not delegated. New migration is CLI-generated20261027154155_documents_library_v2.sql, meaning87base+D1, not Storage88. Metadata field/cursor/gate policy is explicit in D1_MINIMIZATION_POLICY.json. No staging/hosting changes.

The extra QA37d48e9 run40533031634 remains FAIL after16PASS: exact123-row pagination/eight StrictMode requests and reload/back passed, loaded390 inventory and metadata screenshots exist; the next focus assertion did not pass. A controlled StrictMode regression reproduces loss of the invoking button's focus after Escape (drawer closes). The Documents metadata hook now captures its real invoking element and restores focus after unmount only while scope/generation/lifetime are still current. Shared Drawer and StrictMode are unchanged. `focus-strict-before`1FAIL, `focus-strict-after`11PASS and existing `focus-legacy-after`29PASS; no assertions/timeouts relaxed.
