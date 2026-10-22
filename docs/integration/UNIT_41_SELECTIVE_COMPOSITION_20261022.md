# Selective commercial composition — 22 October 2026

Claim: [issue67/6338582645](https://github.com/Asier-Comba/CRM-Telecomunicaciones/issues/67#issuecomment-6338582645).
Base: PR175, `48e4c64e157e1a66e1fd2d8b6694247c870f2a15`,
tree `07097adbc0c0df912a3e69fda4e0ccf1d071794b`.
Working branch: `codex/commercial-integration-20261022`. Delivery uses the existing
PR175 integration branch by normal fast-forward only; no second final product PR.
Final remote source/tree and CI are recorded in issue67 after publication.

## Reviewed selection

| Proposal | Original commits | Selected commits | Scope |
|---|---|---|---|
|180, Oier33|a4607e8c /242458be|dcbc04b /6da8147|Three explicit billing filters clear previous read errors; new rejection remains visible|
|Fiscal34|8b293fbd /11d5db02|d384d29 /06a5c13|ASCII country normalization, two-character HTML validation; existing backend parser unchanged|
|181, Oier36|e436f123 /ad54ad38|572db03 /4a9a5ce|Session/membership errors block creation until explicit successful verification|
|181, Oier37|db00414c /b2287daa|efacd9e /ab7f3a1|Validate existing receipt; uncertain creation only offers access reads during mount|
|181, Oier39|5b2a050 /b2585a53 /6b6d385|0374a78 /3cf3e11 /754ba04|Retire toast/navigation after leaving; preserve actual global Toaster/navigation probe|

All original authors and cherry-pick provenance are retained. The shared financial
test conflict retains BOTH filter/quarter cases and fiscal command assertions.
`fa84c6b` repairs conflict-marker handling before any successful test collection;
the initial syntax failure is retained as a tooling failure, not a product test.
No original assertion, timeout, security condition or pre-existing test was removed.
The three product files and onboarding bank/fixtures match the reviewed proposal
blobs exactly; financial bank is their combined delta. No proposal branch was merged.

## Own causal and regression evidence

Product/check source: `3cf3e113ba5f7337ffdb29519e2b647b2f105557`,
tree `0504329d86ed89496408cf9786b31d52317d71e0`.
Tests-only baseline: `fa84c6bcfbaf6276f71e7659b5b97a6e31a61bb4`,
tree `ca1e3e0c99781c2908fe7892d6908dc841a99d37`.

- Own baseline: 4/4 failures at390 (status filter, issuer country, session failure,
  late new receipt); separate missing-receipt case1/1FAIL. Failures match actual
  stale alert, missing canonical POST, missing safe verification/uncertainty state,
  and late navigation. These are controlled loopback/SDK tests, not Supabase effects.
- Composition: **86/86 PASS**, retries0/skips0/timeouts0; financial28 plus
  onboarding58, internally testing390/768/1440.
- Separate billing recovery: **72/72 PASS**, retries0/skips0/timeouts0; invalid and
  denied receipts48, uncertain effects21, late list/focus3. Distinct from the86.
- Windows bootstrap: **667PASS/5FAIL of672**, skips0. Failures are unchanged
  encrypted-import/private POSIX permission fixtures, in `import-staging-encryption`
  and `protected-telecom-import`; no permission check was relaxed.
- Assistant: **826PASS/1FAIL of827**, skips0. Existing test
  `v3 worker rejects a result before the parent start barrier` received
  `worker_timeout` instead of `worker_protocol_invalid`. Subsequent isolated
  diagnostic on unchanged code1PASS; original full-suite failure remains FAIL.
- QA38 executed separately from original `a1b07625`: **6PASS/3FAIL**, unchanged
  handler. No-success-with-null/empty/invalid-UUID invariant still fails. Bank is
  NOT imported into the green suite or waived. Requires backend-owner decision.
- Focused lint of all9changed paths and full lint PASS. Default build44routes
  and subsequent TypeScript PASS (exit0). CI is not inherited.

Local runtime Node24.20.0, Next16.3.8, Playwright1.61.1; installed Chromium1248
was selected explicitly because expected1228 was absent. This browser difference
is declared, not equivalent to pinned CI. Dependencies reused the exact same
lockfile (SHA256 ada5e9b4ee87407af90d869fff1faf7eced86aa890c1810b8467f699c36314ce).
Initial browser launch failed4with25not-run; two build attempts rejected the
shared dependency junction. Local dependencies were copied into this checkout
before retrying the default build. Initial long lint was interrupted; focused
lint passed and full lint was run again with local dependencies. No product
change hides these setup attempts. Raw logs/JSON remain in this chat's work folder;
the committed manifest contains sanitized case outcomes and log hashes.

Nine inspected screenshots cover loaded billing filters and fiscal editors at
all3widths plus onboarding error390, unconfirmed768 and recovered1440. Fiscal
403 is deliberate controlled denial, not saved fiscal identity. Onboarding images
do not establish Customer360 quality or a real account/workspace. No layout rewrite.

## Contracts, permissions and remaining gates

API handler, RPC, all87migration blobs, contracts, lockfile, build configuration,
AuthGate, tenant/role enforcement, CI, W3 runtime and W5 platform are unchanged.
The UI receipt validator is not authorization. Lost/invalid backend results still
require an authoritative contract and durable recovery across reload; UI mount
protection does not implement durable idempotency.

REQUEST W1 in the claim: define safe non-success acknowledgement for malformed
RPC results and authenticated recovery after uncertain effects/suspension/reload.
No ACK received at preparation; silence is not authority to change shared backend.
No SQL, RPC, browser key, privileged grant or fallback workspace was introduced.

Local Docker daemon unavailable: real Supabase/Auth/RLS/SQL-observed journey
NOT_RUN locally. Final-source CI must establish its own Linux and disposable DB
results. Old48e's87/4042/116UI and180's87/4042/116UI are reference evidence only.
Refreshed181e9b5 CI39575766086 and W439575766079 both terminalFAIL; no pending
result was cancelled or overwritten.175's9workflows were terminal6SUCCESS/3FAIL.

Hosted: W5's22/10 checkpoint6338691438 verifies `a9e977ad` /
deploy `6ad78f6c810c781fba4f5880`, NOT this composition. Hosted acceptance and
rollback for this source NOT_RUN. W5 owns deployment, platform and secrets;
W4 owns independent security acceptance. Storage179 and W5171 are NOT adopted.
Budget0EUR; no production/deployment/provider/visibility change or live AI call.
AI provider remains unavailable/unauthorized per W5, measured live cost absent,
business writesOFF and Issue10open. RELEASE_NOT_ACCEPTED.

## Handoff / next3

1. W1 decide and review QA38 receipt/error/recovery contract, then integrate its
   exact correction and original red tests. W4 reviews independently.
2. W5 consume the final PR175 SHA/tree and its own terminal CI, prepare an
   authorized disposable/hosted synthetic commercial window and rollback. Do not
   transfer prior acceptance or exceptions. Preserve CORE162 and telecom windows.
3. Integrator/W4 review W5's request to separate dependency audit into a dedicated
   CI job without weakening the gate, so functional checks remain independently
   assessable. No exception, waiver or deploy is authorized here.
