# W5 handoff for independent review

Enterprise3 supersedes the closing-candidate status in the dated baseline below. Use `ENTERPRISE_3_CI_EVIDENCE.json`, `ENTERPRISE_3_CHECKPOINT_LEDGER.json`, `ENTERPRISE_3_COMPATIBILITY.json` and `W5_FINAL_W4_REVIEW_PACKET.md`. Source44c619445eac18b449fad95cbb7705e3f89e6d27/merge904c8f891ff297b64ce8b111e484997defcab317 passes five enterprise jobs including actual proxy and Auth mail; optional n8n fails readiness and both vendor scans. Previous W2 browser is89/91 with service:location_assign TIMEOUT and service:addon_end ACTION_FAILED; current run37804190124 is tracked independently. W2/W3 handoffs remain GitHub PR30/31; no frontend or worker branch is imported. Current internal readiness remains false while executable evidence gaps remain.

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


## Enterprise3 closing executable evidence

Source `3c3a3d1291f4dcf3a0db15ff9dd7890c6226a234`, tested merge `c6c65d33011ba949f4c3bcd92f34e00f3396b502`, [enterprise run37809312374](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/37809312374). Actual Supabase71 migrations/291RPC/3576 checks,19 objects,11 public configs and26 secret references pass with five negative controls. Actual Auth/Mailpit22, nginx TLS11, app container/scan/secret boundaries and isolated n8n inactive lifecycle/encrypted empty DB+config restore/fresh owner login pass. Native n8n correctness does not accept its unsafe vendor images: n8n71 HIGH/11 CRITICAL, PG32 HIGH/1 CRITICAL, no secret matches; full npm audit remains five HIGH. Current product browser is PASS,95/95, mergec6c65d33011ba949f4c3bcd92f34e00f3396b502, run37809311902. Exact failure details are in the machine evidence. W2 observed4b3a43f607cac2dd4efb5b8d36d0a058459f6ad2, W3 observed972e96c680a39db25ed1555de4eed9b7149925e3; neither newer branch imported. Company configuration, staging, production, W4 and release acceptance remain blocked. No hosted/provider/DNS/send/worker effect occurred.

Documentation after this executable checkpoint records already executed evidence; the closing PR comment and CI artifacts bind the final document commit separately. No older green is assigned to an untested newer executable.
