VERIFIED: 2026-09-30 iteration 7.1
BRANCH: w3/telecom-readonly-integration-v1
HEAD: commit containing this file
CI: PR #21 — 6 PASS; Dependency Review SKIPPED (Dependency Graph); Critical Playwright SKIPPED
MODE: development-only synthetic read-only preview
USER_CAN_TEST: YES
LOCAL_SYNTHETIC_ONLY: YES
CAN_STAGE: NO
CAN_PRODUCE: NO
W4_ACCEPTED_PREVIEW: e374cedd43331e4da6bf74b768c548ed08c62d92 / PR21 comment5917126784 / CI252
W4_HARDENING: this branch is CANDIDATE IMPLEMENTED; OWNER REVIEW PENDING
HOW_TO_RUN: Node24; npm ci; npm run preview:dev; open http://127.0.0.1:3107/login; choose Ver demo telecom
TEST_DATA: synthetic telecom.v1 fixtures only
SAFE_TO_CLICK: Dashboard, Clientes, Customer 360, Oportunidades, Calendario, Asistente READ
DO_NOT_TEST: writes, external integrations, production data
KNOWN_GAPS: no live LLM provider or persistent follow-ups; real Auth/PostgREST/Storage and durable writes pending
SCREEN_FLOW: /login -> /dashboard -> /clients -> /clients/cust_demo_norte_0001 -> /opportunities -> /calendar -> /assistant
NEXT_BLOCKER: owner review of this hardening candidate; isolated Supabase and durability gates remain separate

## Current hardening candidate

Original PR21 browser/production acceptance is independently confirmed by W4.
This branch adds Node24 doctor/setup, Windows instructions, bounded request streams
and W3 response validation. These changes need fresh CI and W2/W3 owner review.
Use docs/master/PREVIEW_WINDOWS.md. Historical pending browser notes below are
superseded for the original checkpoint, not evidence of this new candidate.

## Historical iteration7.1 (supersedes historical evidence below)

128 Node tests, lint/types/build and actual production-start closure PASS locally.
Real W3 plan/runtime/grounding executes through W2 authorized telecom.v1 service
and fixture repository, not route-specific answers. Ten synthetic companies include
ambiguity and partiality. Unavailable portfolio data does not render as zero.
Only `{text}` input; forged actor/workspace/capability rejected; demo DB search
disabled. Production closes fixture SSR/RSC, POST and demo entry even flag=true.

Real Chromium run `36700961745` (`3333b87`) passed both API boundary tests but
failed desktop/mobile journeys on duplicate Topbar H1. Product corrected, tests
unchanged. Rerun `36701647976` (`3ce23fe`) pending final result. Reports/screenshots/
traces retained by dedicated preview-browser job. Local download still truncated;
no local E2E success claimed. This does NOT replace original W4/Dependency Review
controls; skipped jobs are not executed evidence. USER_CAN_TEST stays NO until full
browser and closure acceptance. CAN_STAGE=NO; CAN_PRODUCE=NO; writes OFF.

## Historical iteration 7.0 evidence

# CRM synthetic read-only preview

This gate is separate from staging or production acceptance. The app compiles,
all seven primary routes returned HTTP 200 in a local dev smoke, and both the
grounded assistant demo query and a cross-workspace denial returned the expected
closed response. `USER_CAN_TEST` remains `NO` until the prepared browser journey
executes successfully; static compilation and HTTP responses are insufficient.

Evidence:

- `npm test`: 125/125 PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS; fixture assistant route is production-closed.
- local dev HTTP smoke: `/login`, `/dashboard`, `/clients`, Customer 360,
  `/opportunities`, `/calendar`, `/assistant` all HTTP 200.
- assistant smoke: `dashboard.get` grounded answer PASS; explicit other-workspace
  request returns `POLICY_BLOCK`.
- `npm run test:e2e:preview`: NOT RUN to page execution because Chromium was not
  installed and the official downloader returned a truncated zero-byte archive.
- GitHub PR #21 CI: baseline guardrails, secret scan, migration policy,
  lint/types/tests/build, embedded PGlite and native PostgreSQL restore PASS.
  Dependency Review is skipped because Dependency Graph is not enabled; Critical
  Playwright is skipped and therefore is not browser-execution evidence.
