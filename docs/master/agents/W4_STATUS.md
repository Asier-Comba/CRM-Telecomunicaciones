# W4 — current independent audit status

VERIFIED UTC: 2026-09-30
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

PR21: accepted local synthetic READ composition; W4128 tests, lint/types/build, HTTP33/17, semantic7 deny-without-read PASS. CI2524/4 desktop/mobile artifact independently verified; local Chromium missing, API2/2 PASS. Production route/SSR/RSC/demo closure PASS. No live-model/real-auth evidence. Readiness doc top and PR body stale.
PR19: C2 both exact absence-code roundtrips + stable nonnull lease PASS; no native runtime adapter/process claim.
PR18: exact24-migration W4 PGlite domain/read/durable/restore PASS; unchanged Storage policy W4 owner/admin/member/A-B/suspension/archive/anon checks PASS. Native PG16 CI216/223/252 separately verified; no Supabase APIs.
Issue10: OPEN P0, durable factory/dispatcher/safe-result/original audit-outbox/process-v2/restart/SIGKILL/one-effect evidence absent; writes blocked.
Issue12: OPEN P1, real Auth/JWT/PostgREST/Storage and scoped execution/environment gates pending.
Dependency Review: skipped; owner must enable Dependency Graph and DEPENDENCY_REVIEW_ENABLED, then execute review incl negative fixture. No bypass. General Critical Playwright skipped; dedicated preview suite passed.
Staging: unprovisioned. Production: untouched. Storage/API/signed capabilities/ZIP ingestion: not accepted. Backup: native synthetic DB restore evidence accepted; commercial encrypted/offsite/object/Auth/config/n8n recovery pending. Enterprise identity/portability deliverables absent. Old W2 reveal/expiry/queued-event/mutation-ordering defects INACTIVE/FUTURE for current fixture path, not fixed.
P2 preview-only: unbounded request.text buffering before size rejection; no production exposure. Client validates response outer shape only; full closed parser/generation fences required before real sensitive backend.

NEXT 3: exact durable adapter+native-v2 driver acceptance; isolated Supabase Auth/PostgREST/Storage tests; enterprise admin/2FA/secrets + full recovery evidence.
Evidence and reproducible commands: docs/master/W4_ITERATION_6.md and .security/reviews/iteration-6.json. Earlier status archived in Git66650cbd989e9386ca2d1274bc4e8d83d448873d. Baseline preserved; no merge/main/deploy authorization exercised.

P1 RESTORE-ACL-001 (Issue22): native drill uses --no-acl and postgres-only reader smoke; privilege recovery unproven. W4 ACL-loss model reproduces anonymous RPC access if REVOKE is omitted. Preserve/remap ACLs and prove restored anon/authenticated/service-role matrix before recovery acceptance; synthetic preview/composition unaffected.
