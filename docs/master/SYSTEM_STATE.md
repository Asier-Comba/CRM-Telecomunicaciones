# CRM Telecom — current system state

VERIFIED UTC: 2026-10-01
CAN_INTEGRATE: YES
CAN_STAGE: NO
CAN_PRODUCE: NO
CAN_TEST_SYNTHETIC_PREVIEW: YES

| Component | Exact reviewed SHA | Decision |
|---|---|---|
| Accepted canonical base | `6b0e30e7444de57100e4d983b3564a0c3b336b2c` | Safe composition; main absent |
| W2 backend / PR17 | `8de57dc2f84634156655f6c79047d545bbb86a6c` | Prior import/runtime P1s fixed |
| W5 platform / PR18 | `1c8b3e9fe0fba12d9bad6b313b46e8be7a574603` | All14 READ/schema foundations accepted |
| W2 C2 / PR19 | `a917bbb41ef8192344dc49737cd78fd52fe29649` | Exact failure codes and persisted lease accepted |
| W3 foundation / PR9 | `dc19ce65cbc89df92ae0496af2d358eea74e0493` | Live head observed; native mutation acceptance absent |
| Synthetic preview / PR21 | `e374cedd43331e4da6bf74b768c548ed08c62d92` | Local read-only preview accepted |

W4 branch: `w4/night-shift-v3`; preserve `w4/security-baseline@5cb872c0f3efb9ca9c798aa3c049a7120ddcd6d0`. All PRs remain Draft; no merge/main/deploy.

Evidence: W4 clean128 tests/lint/types/build; loopback HTTP33 development/17 production checks; semantic7 denies with zero repository calls; PGlite24/25 migrations, tenant/read/Storage SQL and C2 round-trips PASS. CI252 artifact independently checksum/report inspected: Chromium desktop/mobile4/4, zero retries/flaky/skipped. Local browser cannot launch (download truncated); local Playwright API2/2 passes. Native PostgreSQL16 CI216/223/252 schema and synthetic dump/restore PASS, separately from W4 PGlite execution.

OPEN P0: Issue10 physical durable adapter/process/recovery/audit-outbox evidence; assistant mutations blocked.
OPEN P1: Issue12 local Auth/JWT/PostgREST/Storage candidate PASS; hosted/scoped privileged execution and enterprise environment readiness pending; Dependency Graph/review execution; staging and commercial DR.
Historical W2 sensitive expiry/revocation/queued-event/timestamp/ABA/NaN defects are INACTIVE/FUTURE in current fixture UI, not proven fixed. Import same-key resume command remains unimplemented/unproven.

Storage: private buckets, linked-object SQL isolation accepted; signed access/expiry/revocation/list controls/orphan cleanup/API/object recovery pending. ZIP: quarantine only; no ingestion validator/scanner/extraction accepted.
Backup: native synthetic pg_dump/checksum/fresh-db restore is real evidence; encrypted offsite production DB+Storage/Auth/config/n8n DR remains unproven.
Supabase local Auth/PostgREST/Storage APIs were exercised by PR25 candidate; remote Supabase was NOT exercised. Local TOML targets PG15; native CI targets PG16. Staging unprovisioned; production untouched.

Human preview: Node24; `npm ci`; `npm run preview:dev`; http://127.0.0.1:3107/login → **Ver demo telecom**. Synthetic/read-only, no live LLM or real Arizan data. PR23 contains readiness correction; original acceptance and candidate reviews remain distinct.

Canonical evidence: `.security/reviews/iteration-6.json`, `.security/release-gates.json`, `W4_ITERATION_6.md`; PR21 comment5917126784, PR19 comment5917128725, PR18 comment5917130943. Previous state archived in Git at66650cbd989e9386ca2d1274bc4e8d83d448873d; do not reuse its heads as current.

P1 RESTORE-ACL-001 (Issue22): PR24 implements and executes native restored grants/role matrix and negative control; owner integration/independent review pending. Commercial recovery remains blocked; synthetic preview/composition unaffected.

## W4 iteration6.2 — current candidate delta, 2026-10-01

PR23 `6210a9d5af6766679b231954199bc77b07ad8559`: CI255 Windows/path-spaces, Chromium4/4 and production closure PASS; W3 owner review pending.
PR24 `a7fb1048c96c0571c64ddc4d3637701223a75dc8`: CI256 nativePG16 fresh/restored62-function grants and role calls PASS; ACL-loss negative control rejected and attacked. Issue22 stays open for W2/W5 adoption.
PR25 `9ae0766cce5e1174c16f2e5d04d741c5d146c27d`: CI259 + dedicated Supabase run36885605309 PASS. CLI2.119.0, DB15.19, Auth2.197.0, PostgREST16.4, Storage1.79.28;25 migrations;10 actual Auth users;263 HTTP checks incl forgedJWT,A/B,multi-membership/profile mismatch,revoked/suspended admin with validJWT,14 server RPCs,private Storage/read/list/write/quarantine PASS. Build47 client bundles contain no private canary values. Tested merge SHA6af91738a8dce03e31f3a9239769856d9b84a9f6 has identical tree to candidate. Owner review pending; no self-approval.

LOCAL PLATFORM CONTRACT PROVEN as candidate evidence; not hosted staging. platform.auth_rls remains pending: scoped/revocable service principals and approved environment configuration absent. Global service_role bypasses RLS; its tests prove function-internal actor reauthorization only. Signed document capabilities, ZIP ingestion, hosted SMTP/MFA/provider state and commercial DB/object/Auth/n8n DR remain unaccepted. Issue10 durable blocker unchanged.
Portability and enterprise identity/secrets contracts + config inventory published in PR25. Dependency Review still requires owner to enable Dependency Graph and DEPENDENCY_REVIEW_ENABLED then run review/negative fixture; no bypass. Production untouched. CAN_STAGE=NO;CAN_PRODUCE=NO. Evidence: .security/reviews/supabase-local-v1.json.
