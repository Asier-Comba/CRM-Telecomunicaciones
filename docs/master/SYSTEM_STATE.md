# CRM Telecom — current system state

VERIFIED UTC: 2026-09-30
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
OPEN P1: Issue12 real Auth/JWT/PostgREST/Storage, scoped privileged execution and enterprise environment readiness; Dependency Graph/review execution; staging and commercial DR.
Historical W2 sensitive expiry/revocation/queued-event/timestamp/ABA/NaN defects are INACTIVE/FUTURE in current fixture UI, not proven fixed. Import same-key resume command remains unimplemented/unproven.

Storage: private buckets, linked-object SQL isolation accepted; signed access/expiry/revocation/list controls/orphan cleanup/API/object recovery pending. ZIP: quarantine only; no ingestion validator/scanner/extraction accepted.
Backup: native synthetic pg_dump/checksum/fresh-db restore is real evidence; encrypted offsite production DB+Storage/Auth/config/n8n DR remains unproven.
Supabase local/remote Auth/PostgREST/Storage were NOT exercised. Local TOML targets PG15; native CI targets PG16. Staging unprovisioned; production untouched.

Human preview: Node24; `npm ci`; `npm run preview:dev`; http://127.0.0.1:3107/login → **Ver demo telecom**. Synthetic/read-only, no live LLM or real Arizan data. Product readiness top/PR21 description remain stale; current W4 decision supersedes them.

Canonical evidence: `.security/reviews/iteration-6.json`, `.security/release-gates.json`, `W4_ITERATION_6.md`; PR21 comment5917126784, PR19 comment5917128725, PR18 comment5917130943. Previous state archived in Git at66650cbd989e9386ca2d1274bc4e8d83d448873d; do not reuse its heads as current.

P1 RESTORE-ACL-001 (Issue22): native drill uses --no-acl and postgres-only reader smoke; privilege recovery unproven. W4 ACL-loss model reproduces anonymous RPC access if REVOKE is omitted. Preserve/remap ACLs and prove restored anon/authenticated/service-role matrix before recovery acceptance; synthetic preview/composition unaffected.
