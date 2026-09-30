VERIFIED: 2026-09-30 local build, 125 tests and HTTP smoke
BRANCH: w3/telecom-readonly-integration-v1
HEAD: commit containing this file
CI: PR #21 — 6 PASS; Dependency Review SKIPPED (Dependency Graph); Critical Playwright SKIPPED
MODE: development-only synthetic read-only preview
USER_CAN_TEST: NO
HOW_TO_RUN: copy .env.preview.example to .env.local; npm ci; npm run dev; open /login; choose Ver demo telecom
TEST_DATA: synthetic telecom.v1 fixtures only
SAFE_TO_CLICK: Dashboard, Clientes, Customer 360, Oportunidades, Calendario, Asistente READ
DO_NOT_TEST: writes, external integrations, production data
KNOWN_GAPS: browser E2E prepared but not executed because the Playwright Chromium download returned a zero-byte/truncated archive; no live LLM provider
SCREEN_FLOW: /login -> /dashboard -> /clients -> /clients/cust_demo_norte_0001 -> /opportunities -> /calendar -> /assistant
NEXT_BLOCKER: execute the prepared Chromium E2E in CI or an environment with the Playwright browser installed

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
