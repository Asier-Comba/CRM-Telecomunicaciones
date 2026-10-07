# W5 handoff for independent review

Exact evidence SHA and run links are in `W5_PLATFORM_ACCEPTANCE.json`; no older
green is attributed to a later head. PR34 remains Draft against current W2.

W2: hosted product mode is not accepted; do not display staging-ready, production-
ready, mail-connected, n8n-connected or AI-connected based on a key. Safe statuses
are not_configured/configured/degraded/unavailable. W5 metadata health never grants
tenant access. Server flags and immutable public build configuration remain distinct.

W3: no PR31 source consumed. Do not assume a persistent durable worker, dispatcher,
lease/retry/rate interface or semantic writes exists in this deployment. Publish the
accepted runtime contract and security/native process proof before W5 adds a worker
container/scheduler. Worker/provider secrets remain private, metrics include only
aggregate requests/tokens/latency/errors/model, and effects stay off by default.

W4 audit packet: fresh W2 provenance; environment inventory and guards; public
credential validator; actual build private canaries and cache removal; Docker digest,
nonroot/read-only/runtime startup gates; controlled forward-header proxy; Auth
management adapter and templates; inactive n8n export contract; DB/public + local
Auth users/identities backup scope; authenticated archive; Storage byte/hash/metadata
recovery; fresh schema/ACL comparison; actual post-restore login/tenant/revocation/
Storage authorization; bounded logs; retention plan; no production mutation path.

Review incomplete areas separately: hosted Auth/MFA/sessions/provider state,
live email/DNS/TLS, offsite encryption/key policy and retention, existing product
logging/cookies/CORS in hosted mode, real scanner/import, hosted signed Storage,
W3 durable worker, dependency advisories and full W2 browser acceptance. The proxy
rate limit is one-host readiness; multi-instance distributed limiting remains an
accepted-adapter requirement. Minimal CSP does not claim full nonce-based CSP proof.

No W5 platform freeze, W4 approval or market-ready declaration is made here.

The real Supabase run37699212945 exposed inherited service_role EXECUTE on38
legacy helper/trigger functions that the native manifest denies. Migration
`20261008010000_align_provider_rpc_execution_grants.sql` revokes only those
extra grants and future postgres/public service_role default EXECUTE. It leaves
PUBLIC/anon/authenticated behavior and function bodies unchanged. W4 must review
this real-provider alignment and exact71-migration native/Supabase evidence.
The RPC comparison now normalizes property/list order while still rejecting
missing/extra signatures, changed security mode and any changed execution grant.

Full browser acceptance is a separate W2 result. The observed source `8a424bac`,
merge `2ac3471e`, run `37702649473` failed `real_browser_login` with TIMEOUT at `/login`;
no full journey PASS is attributed to that source. Consult the acceptance JSON
for the closing candidate's own browser run. Do not repair product acceptance
by dropping assertions, extending arbitrary timeouts or disabling its boundary.

Closing source `92f1529d1a058ff48d293305a1ad73055b672594`, tested merge
`c8dc0de83633f6a9404e72894a1bf97c2464a25a`: W5 run `37703545798` PASS in all three
jobs. Full W2 browser run `37703545880` is FAIL with 84/87 groups passing:
`reports_exact_scope_period_export_and_error_mobile` (TIMEOUT),
`confirmation_native_focus_cycle_escape_restores_trigger_without_write` (TIMEOUT),
`billing_analytics_real_cohorts_exact_money_currency_and_accessible_tables`
(ACTION_FAILED). These match W2's published 84/87 gap report; login and all 84
listed groups passed on this candidate. General CI run `37703545934` passes all
396 tests/lint/types/build and its other executed jobs, but fails the unsuppressed
five HIGH braces findings; Critical Playwright is skipped by that blocking gate.
No older PASS or backend-only PASS overrides these results. W2 must publish
accepted full-browser and hosted runtime evidence before platform launch.
