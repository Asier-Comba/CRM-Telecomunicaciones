# Auth form readiness

Owner: W2. Branch: `codex/w2-auth-hydration-readiness`.
Base: portability/equipment recovery `ebd4000b6fea69e3b56af40119cf6d3a5baa2366`.

W3 composition5f9b393 / actual checkoutf2eeb3c0d3e0624c4b615fc148f6c2bf405048df
failed run37850530058 at real_browser_login/SUBMIT_LOGIN. Its screenshot shows
filled credential DOM values and a disabled submit control, with no token HTTP
response. No product browser group passed. Before that failure, actual73-migration
history/CAS/replay/revocation and cookie thread lifecycle passed, along with3409
backend and227 takeover checks; teardown passed. These are separate facts and
cannot be promoted into product compatibility acceptance.

The login inputs previously accepted input in server-rendered HTML before their
React change handlers were ready. Early DOM fill can consequently leave React's
validated form state empty. The candidate uses React's stable server/client
snapshot mechanism: fields and submit remain disabled in SSR/hydration, then
become interactive after React activates them. This is a UI readiness boundary,
not an authorization signal. Email/password rules, current cookie Auth, server
scope, roles, revocation, reset-password and redirect behavior remain unchanged.
No timer, reload, retry or relaxed validation repairs the state.

The existing real-browser login group deliberately holds only the app's JS asset
delivery, requires disabled fields/submit and busy form in the server HTML,
releases those real assets, requires editable fields, retains disabled submission
for invalid email/short password, then requires a valid enabled submit,
then performs the original actual Supabase login and dashboard check. Backend
responses, session, credentials and clock are not mocked. All107 groups remain;
the original30-second defaults remain. Asset routing is released even on failure.

Reference: [React server rendering and hydration snapshots](https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering).
Current bundled Next testing/Strict Mode guides were read; Strict Mode remains
enabled. Full exact-source CI/Supabase is required before acceptance. No previous
successful runtime or screenshot accepts this new application code.

Local Windows focused browser proof PASS: the real app's JavaScript delivery was
held, SSR fields/submit were disabled, and releasing the actual assets made the
fields editable and recorded valid React form state. Outbound browser requests
were blocked and Auth was not submitted. This proves frontend readiness only,
not real Supabase Auth or the full product. The one owned app/browser pair was
closed; no personal process was closed. Lint/types and script syntax PASS. Full
build/Auth/product tests remain the exact-source CI gate. The asset harness uses
unrouteAll with behavior=wait so pending handlers finish instead of racing cleanup;
errors are not silently ignored.

Issue29 continues to fail the full audit with five HIGH findings. Assistant writes
remain disabled pending Issue10 and independent W4 review; physical business
dispatcher durability remains NOT_TESTED. W5 scripts are untouched. PUBLIC
repository risk and the original unavailable00–19 master sources remain recorded.
Local persistent Supabase stays blocked by the observed memory headroom; its CLI
was verified without login/start. VPS/production and external sends are untouched.

Next three: prove SSR-to-interactive readiness locally and actual Auth in CI;
consume the accepted fix by normal W3 composition and require all107 groups;
integrate accepted Customer360/billing presentation changes with that composition.
## Terminal exact-source evidence

Source `55fa568581b7798d42dfcb2774533f1764215b58`, executed `3a7f252e12e2f6bdabfafc0137196842c70c8240`, source-identical tree `ed4679a222161907338f31234adf6e3f602692c0`: Supabase37853592165/job113572590749 **107/107**, Auth200,3349+227,70 migrations,teardownPASS. Exact quality405/lint/types/buildPASS; audit5HIGH FAIL. Later exact composed history source92ea85c passes107/107 and actual Auth/history/browser; new merges still need their own evidence. Detailed ledger: W2_W3_ACCEPTANCE_LEDGER_20261009.md. Older failures below remain historical evidence, not current source acceptance.
