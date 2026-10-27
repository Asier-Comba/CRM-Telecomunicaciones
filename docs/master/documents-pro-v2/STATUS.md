# Documents Pro V2 — D1A scoped frontend checkpoint

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
