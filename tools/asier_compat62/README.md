# Unit62: commercial candidate / schema88 compatibility

Product baseline: PR191 `4cebe53d442b418436a485e72c47973555b3afab`.
This Draft193 adds tests and a consumable contract, not a product/Storage179
integration. `src/`, canonical migrations, dependencies and the original116
scenarios are unchanged. CLAIM62: issue67 comments6425250725/6425303003.

## Focused disposable acceptance

`node --experimental-transform-types tools/asier_compat62/run.mjs`

CI-only, pinned Supabase CLI2.119.0, empty runner, inherited hosted configuration
rejected. It starts the existing local config with87 canonical migrations,
creates five ephemeral synthetic Auth identities in two tenants, runs focused
checks, applies the exact pinned W5 SQL88 fixture, and compares the same paths.
The overlay does not add a canonical migration or a migration-history row.
Source SHA/tree, fixture hash, checks and teardown are recorded in
`unit62.safe.json`. No tokens, passwords, object paths or business payloads
are exported. This is not a replacement for W5's profile88 integration.

The first run40387250447 on7c96587 is retained:97PASS/1FAIL, teardownPASS.
Its cleanup fixture expired only1second ago; the actual contract requires24h.
7775869 adds the early-expiry403 negative and a25h-expired fixture. Its own
run40388209216/job121801986222 passed124checks, browser and teardown. Later
source changes require their own exact results; consult PR193 and the report.

### Observed product87 against effective Storage88

| Path | Before87 | After88 | Commercial interpretation |
| --- | --- | --- | --- |
| Customer / active contract / service / line | PASS | PASS | Same ancestry persisted |
| Opportunity1200EUR and linked draft363EUR | PASS | PASS | Replay/readback/role/tenant controls |
| Document upload intent, first upload, finalize | PASS | PASS | Does not establish download safety |
| Protected document metadata | PASS | PASS | Ordinary authorization still applies |
| Download ticket / manifest | 200 | 200 | Admission is not a successful byte read |
| Direct user-JWT object read | 200 | 400 | Same path/object remains present |
| Current application download proxy | 200 | 403 | Incompatible with88 |
| Same-byte pending upload retry | 200 | 409 | Comparison reader is blocked |
| Current integrity verification | 200 | 403 | Verification reader is blocked |
| Expired pending object with exact cleanup claim | Not compared | 200 | Remaining SELECT exception, W4 review required |

These focused checks do not rerun or re-certify the other modules in116.
No hosted CDN cache, server reader, remote Auth or deployment is tested.
`contract.json` contains the machine-consumable bindings and limits. The runner
checks that its observed transport matrix matches that contract.

W5 must adapt the shared byte reader, duplicate-upload comparison, maintenance
verification and dependent private invoice content. Keep exact path/size/MIME/
digest checks and current manifest authorization before/after asynchronous reads.
This unit introduces no privileged reader or hosted service-role credential.
Documents and maintenance remain OFF for commercial/hosted acceptance until
owner/W4 approve the server/secret/CDN/cleanup contract. Do not adopt179 here.

## New coherent browser operation

The same disposable stack is restarted with document content/maintenance OFF.
A real browser logs in with ownerA and creates, through visible controls only:
empty customer → manual contract → activate → mobile service → activate → line
→ activate → opportunity1200EUR linked to that service/contract → draft363EUR
linked to the same customer/contract/service/opportunity. A full page reload,
fresh authorized relation reads and editor readback must preserve all four IDs.
SQL only observes those UI effects. No SQL business fixtures or mocked routes
populate this operation. Member/viewer financial denial, foreign tenant owner
denial and viewer read-only access to the same line are separately checked.

The screenshots cover1440/768/390. The initial7775869 desktop/tablet shots caught
relation controls before their reads completed; only its390 shot showed loaded
labels. The successor waits for all three freshly authorized markers before
capturing. Do not describe those earlier pending shots as completed visual QA.

## W2 handoff: stale inventory after confirmed activation (OPEN)

Actual7775869 screenshot `02-contract-active.png` shows the quick card Active
and its top inventory row Draft. A later navigation refreshes the row. The
controlled reproduction uses the real components, repository and parsers,
synthetic identity/HTTP, not Auth/RLS. Before01:1FAIL/1PASS, no retries,5000ms.

```
# Set PLAYWRIGHT_BROWSERS_PATH to the already installed matching browser.
# Set ASIER62_DIAGNOSTIC_OUTPUT to a NEW absolute output folder.
node node_modules/@playwright/test/cli.js test --config tools/asier_compat62/inventory.config.mjs
```

`portfolio-inventory.diagnostic.spec.ts` intentionally exposes the unresolved
failure; it is a separate W2 handoff, not part of the passing compatibility job.
That job explicitly runs `*.test.mjs` plus the real-stack browser flow. A green
compatibility job does not erase this known product failure.

Observable cause: `IntegratedPortfolio.saved` reauthorizes and updates quick
cards, but supplies no invalidation to `TelecomPortfolioInventory`; the existing
inventory collection keeps its prior result. The control clicks **Actualizar
Contratos**, makes a second collection read and displays Active. W2 ACK is
requested in issue67/6425736582 before changing those existing components.
The next unit is a scoped refresh after confirmed readback, preserving current
tab/filter/page and discarding stale context responses. Never replay a mutation
just to refresh the collection. No F0/F5 diagnostics or fixes are reopened.

## Independent review and release limits

W5's technical read confirms fixture identity and the document incompatibility;
it requested a tighter denial oracle. Own regression:2FAIL/1PASS before,
3PASS after; a500 response or a missing fixture object cannot count as denial.
W4's read of exact4ce confirms lock/onboarding guard and the existing28 untriaged
historical findings / vulnerable auxiliary images. It found an orphan-waiter
risk in the new test harness:2FAIL/1PASS before,3PASS after coordinated observation
and action handling. Neither review is W4_ACCEPTED or deployment approval.

Reuse unit60, do not create a packager. The existing4ce Windows runtime ZIP is
still SHA256 `1733e30522a6a9531f9e5a1cf2a4671fbf95f53b5d096d27f1568074c393d4f7`;
it is unconfigured, not a Netlify artifact or Linux image. Public build/runtime
configuration and hosted artifact binding still need W5 approval. Rollback must
use a previously approved immutable hosting artifact plus matching config;
never reverse88 or repurpose protected Arizan. No hosting change is authorized.

Hosted smoke remains: real login, same coherent operation, reload/readback,
role/tenant isolation, logout and closed document paths. The exact Netlify
origin still has a saved browser DENY: the owner/admin must allow only that
origin in browser agent permissions; Team Protection stays ON. No bypass.
Account free capacity is UNKNOWN until owner/W5 supplies current quota evidence;
no paid resource or registry publication is requested. Repository PUBLIC:
owner visibility decision remains pending; publish no credential values.

**RELEASE_NOT_ACCEPTED.** Staging, Netlify, EasyPanel, main, Arizan and live AI
are unchanged by this unit. Final exact SHA/CI/artifact hashes and review/handoff
status are recorded in PR193 / issue67, separately from baseline191 acceptance.
