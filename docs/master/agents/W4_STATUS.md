# W4 — current independent audit status

VERIFIED UTC: 2026-10-01
BRANCH: w4/night-shift-v3 (this checkpoint)
CAN_INTEGRATE: YES
CAN_STAGE: NO
CAN_PRODUCE: NO
CAN_TEST_SYNTHETIC_PREVIEW: YES

base: `6b0e30e7444de57100e4d983b3564a0c3b336b2c`

w2Backend: `8de57dc2f84634156655f6c79047d545bbb86a6c`

w5Platform: `1c8b3e9fe0fba12d9bad6b313b46e8be7a574603`

w2C2: `a917bbb41ef8192344dc49737cd78fd52fe29649`

w3Foundation: `dc19ce65cbc89df92ae0496af2d358eea74e0493`

preview: `e374cedd43331e4da6bf74b768c548ed08c62d92`

PR21: accepted local synthetic READ composition; W4128 tests, lint/types/build, HTTP33/17, semantic7 deny-without-read PASS. CI2524/4 desktop/mobile artifact independently verified; local Chromium missing, API2/2 PASS. Production route/SSR/RSC/demo closure PASS. No live-model/real-auth evidence. PR23 supplies candidate readiness correction; W3 review pending.
PR19: C2 both exact absence-code roundtrips + stable nonnull lease PASS; no native runtime adapter/process claim.
PR18: exact24-migration W4 PGlite domain/read/durable/restore PASS; unchanged Storage policy W4 owner/admin/member/A-B/suspension/archive/anon checks PASS. Native PG16 CI216/223/252 separately verified; no Supabase APIs.
Issue10: OPEN P0, durable factory/dispatcher/safe-result/original audit-outbox/process-v2/restart/SIGKILL/one-effect evidence absent; writes blocked.
Issue12: OPEN P1; PR25 real local Auth/JWT/PostgREST/Storage candidate PASS; hosted/scoped execution/environment acceptance pending.
Dependency Review: skipped; owner must enable Dependency Graph and DEPENDENCY_REVIEW_ENABLED, then execute review incl negative fixture. No bypass. General Critical Playwright skipped; dedicated preview suite passed.
Staging: unprovisioned. Production: untouched. Local Storage/API policy and synthetic recovery: candidate PASS; signed capabilities/ZIP ingestion: not accepted. Backup: native synthetic DB restore evidence accepted; commercial encrypted/offsite/object/Auth/config/n8n recovery pending. Enterprise identity/portability contracts supplied in PR25; operational adoption pending. Old W2 reveal/expiry/queued-event/mutation-ordering defects INACTIVE/FUTURE for current fixture path, not fixed.
P2 preview boundary: PR23 bounded request/closed response candidate passes CI255; W3 integration pending. Future sensitive-generation controls remain separately gated.

NEXT 3: owner review/adoption of PR23/24/25/26; scoped principals + isolated hosted staging/enterprise credentials; exact durable adapter/native-v2 plus commercial recovery evidence.
Evidence and reproducible commands: docs/master/W4_ITERATION_6.md and .security/reviews/iteration-6.json. Earlier status archived in Git66650cbd989e9386ca2d1274bc4e8d83d448873d. Baseline preserved; no merge/main/deploy authorization exercised.

P1 RESTORE-ACL-001 (Issue22): PR24 implements and executes native restored grants/role matrix and negative control; owner integration/independent review pending. Commercial recovery remains blocked; synthetic preview/composition unaffected.

## W4 iteration6.2 — current candidate delta, 2026-10-01

PR23 `6210a9d5af6766679b231954199bc77b07ad8559`: CI255 Windows/path-spaces, Chromium4/4 and production closure PASS; W3 owner review pending.
PR24 `a7fb1048c96c0571c64ddc4d3637701223a75dc8`: CI256 nativePG16 fresh/restored62-function grants and role calls PASS; ACL-loss negative control rejected and attacked. Issue22 stays open for W2/W5 adoption.
PR25 `9ae0766cce5e1174c16f2e5d04d741c5d146c27d`: CI259 + dedicated Supabase run36885605309 PASS. CLI2.119.0, DB15.19, Auth2.197.0, PostgREST16.4, Storage1.79.28;25 migrations;10 actual Auth users;263 HTTP checks incl forgedJWT,A/B,multi-membership/profile mismatch,revoked/suspended admin with validJWT,14 server RPCs,private Storage/read/list/write/quarantine PASS. Build47 client bundles contain no private canary values. Tested merge SHA6af91738a8dce03e31f3a9239769856d9b84a9f6 has identical tree to candidate. Owner review pending; no self-approval.

LOCAL PLATFORM CONTRACT PROVEN as candidate evidence; not hosted staging. platform.auth_rls remains pending: scoped/revocable service principals and approved environment configuration absent. Global service_role bypasses RLS; its tests prove function-internal actor reauthorization only. Signed document capabilities, ZIP ingestion, hosted SMTP/MFA/provider state and commercial DB/object/Auth/n8n DR remain unaccepted. Issue10 durable blocker unchanged.
Portability and enterprise identity/secrets contracts + config inventory published in PR25. Dependency Review still requires owner to enable Dependency Graph and DEPENDENCY_REVIEW_ENABLED then run review/negative fixture; no bypass. Production untouched. CAN_STAGE=NO;CAN_PRODUCE=NO. Evidence: .security/reviews/supabase-local-v1.json.

## W4 iteration6.3 — enterprise candidate, 2026-10-01

PR26 `7de856c7bae6ac08a9b8fb6cf0f91331bc472833`, stacked on PR25; CI269 and dedicated run36936714255 PASS. Tested merge `d970d1c2a78d487d6dcf4293e2647a57d3bd38c9` has the identical candidate tree. PR23/24/25 unchanged; owner reviews pending.

ENTERPRISE_READINESS: tested candidate, no operational adoption.
SUPABASE_LOCAL: PR25 evidence preserved; enterprise test overlay uses CLI2.119.0/PG15.19/Auth2.197.0/PostgREST16.4/Storage1.79.28/Mailpit1.31.3.
AUTH_EMAIL_LOCAL: PASS123 checks; signup/confirmation/reset/invite,8 unsafe redirects constrained, secrets absent,EXTERNAL_SENDS=0. Old login session denied after this tested reset; not a universal session-policy claim.
SMTP_PRODUCTION: NOT_PROVISIONED/NOT_TESTED.
ENV_CONTRACT / SECRET_POLICY: 76 adversarial tests PASS; client literal graph108 files and portability233 files PASS. Structural/reference guards, not vault provisioning evidence.
STORAGE_RECOVERY: local synthetic namespace PASS42 checks;3 exports/restores,hash+metadata match,no missing/orphan,A/B/revoked/archived denial preserved. Not a new-environment DB restore,offsite backup or commercial DR. Database restore != Storage restore.
COMPANY_BOOTSTRAP: machine ownership/environment/Auth/secrets checklist + runbook ready; human approval/provider state unset. Hosted read-only probe fails before network for PROD/missing approval/wrong ref; hosted execution NOT_TESTED.
SCOPED_PRINCIPAL: user-JWT identity-read alternative PASS;14 server-reader principal migration remains NOT_IMPLEMENTED. No grants changed.
ISSUE12: OPEN narrowed to hosted isolated staging,scoped/revocable server identity,operational enterprise configuration,hosted smoke. Signed document capabilities/ZIP ingestion remain separately unaccepted; no real data before company cutover.
ISSUE22: OPEN PR24 owner adoption pending. ISSUE10: OPEN,writes OFF. Dependency Review owner configuration remains required; skip is not PASS.
CAN_STAGE: NO
CAN_PRODUCE: NO
NEXT_3: W2/W5 exact-head owner review of PR24/25/26 + W3 PR23; approve company ownership/config and provision separate synthetic STAGING; implement/review scoped principal and collect hosted acceptance/commercial recovery (assistant durability separately #10).
Evidence: `.security/reviews/enterprise-readiness-v1.json`. No main/merge/deploy,hosted writes,external mail,DNS,billing or real data.
