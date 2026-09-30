# W3 status — iteration 7.1 read integration

## Current checkpoint (supersedes historical evidence below)

Updated 2026-09-30; Draft PR21, same branch/base. No main merge/deployment.
Visible assistant now runs real W3 `runTelecomReadTurn`: bounded preview planner
→ validated semantic plan → typed read capability → W2 authorized telecom.v1
service → fixture repository → validated DTO → grounding/composer → closed UI.
Only `{text}` is accepted; actor/workspace are server-owned. No planner DB/SDK.
Scripted preview planner is NOT a live LLM/general-semantic evaluation. Ten
synthetic companies include ambiguous names and partial portfolio; unavailable
contracts/services/lines stay unavailable, never zero. No persistent follow-ups.

Candidate fixes for W4: production closes fixture SSR/RSC routes, assistant POST,
demo identity and login entry even with demo flag enabled; demo search never queries
legacy database readers. W2/W3 navigation parsers validate `customer_id` for customer
navigation; foreign-customer navigation still fails closed. No SQL/migration/RLS
changes. These are tested candidates, NOT independent W4 acceptance.

Evidence: 128 Node tests, lint/types/build PASS locally; actual production-start
closure PASS. Chromium really executed in CI `36700961745` (`3333b87`): both API
tests PASS, both visual journeys FAIL on duplicate H1. Fixed Topbar markup without
weakening tests. Rerun `36701647976` (`3ce23fe`) pending final result. Dedicated job
retains reports/screenshots/traces and runs build+production closure after E2E.
Local browser download truncated; no local E2E success claimed.

Gates: USER_CAN_TEST=NO until full browser acceptance; CAN_STAGE=NO;
CAN_PRODUCE=NO; Issue10 OPEN; writes OFF; durable adapter absent in this slice.
Dependency Review configuration-skipped and original Critical Playwright skipped,
neither counted as executed evidence. HOW_TO_RUN: Node24; npm ci;
npm run preview:dev; http://127.0.0.1:3107/login; Ver demo telecom.

W2 handoff: review navigation-consistency candidate; existing server telecom.v1
boundary is the integration seam. Synthetic fixtures must never become DB truth.
W4 handoff: independently verify SSR closure, demo-search isolation, forged
authority denial and foreign navigation rejection. Keep durability/write gates shut.
UI handoff: closed response blocks and source attribution preserve PARTIAL and
UNAVAILABLE; internal execution context never leaves the route.

## Historical iteration 7.0 checkpoint

BRANCH: `w3/telecom-readonly-integration-v1`, based exactly on W2
`a917bbb41ef8192344dc49737cd78fd52fe29649`.
INTEGRATION: Draft PR #21 targets `w2/platform-closure-v1`; remote CI has six
successful jobs. Dependency Review and Critical Playwright are explicitly skipped
by repository/environment configuration, not reported as executed evidence.

PRODUCT: reviewed W3 telecom READ slice imported without mutation/durable runtime.
Active Dashboard, Clientes, Customer 360, Oportunidades, Calendario and Assistant
surfaces are telecom-specific and consume reserved synthetic fixtures. Inherited
billing, inbox, automation and property paths are outside active preview navigation.

SAFETY: demo access requires the explicit demo feature flag; the preview assistant
route additionally refuses production. No contact/tax values, real Arizan data,
external sends, assistant writes or raw database access. Cross-workspace text is
closed with `POLICY_BLOCK`.

EVIDENCE: 125/125 Node tests, lint, typecheck and production build PASS. Local HTTP
smoke returned 200 for seven primary routes. Browser E2E is versioned but page
execution is pending: Playwright Chromium was absent and its official download
returned a truncated zero-byte archive in this environment. GitHub PR #21 CI passed
baseline guardrails, secret scan, migration policy, app lint/types/tests/build,
embedded PGlite and native PostgreSQL zero-to-head/synthetic restore.

GATES: `USER_CAN_TEST_SYNTHETIC_PREVIEW=NO`; `CAN_STAGE=NO`; `CAN_PRODUCE=NO`.
PR9 remains the isolated assistant foundation. Issue10 remains open. Assistant
mutations and the W2 durable adapter remain disabled/absent.

NEXT 3: run preview E2E with installed Chromium; replace the deterministic fixture
planner with an approved provider module through `telecom-read-turn`; obtain W4
independent review before any broader integration claim.
