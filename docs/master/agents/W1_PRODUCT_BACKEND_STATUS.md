# W1 product backend status

HEAD: B2 closed customer/contact checkpoint (see Git history)
PR: #28 Draft
SOURCE: w2/platform-closure-v1@a917bbb41ef8192344dc49737cd78fd52fe29649
PARITY: inventoried; behavioral percentages not yet measured
CUSTOMERS: normal create/update/archive/restore + CAS editor implemented, owner/admin JWT
CONTACTS: create/update/archive/restore/primary + bounded PII editor implemented, owner/admin JWT
PORTFOLIO: 14 telecom.v1 reads preserved; actions pending
OPPORTUNITIES: stages/schema/read existing; commands pending
TASKS: versioned schema/read existing; commands pending
CALENDAR: schema/read existing; bounded query/commands pending
DASHBOARD: v1 attention existing; rich metrics pending
BILLING: missing
DOCUMENTS: metadata/private Storage foundation; product interfaces pending
SEARCH: customer search existing; global missing
INBOX: missing
AUTOMATIONS: integration contract pending
TEAM: onboarding existing; management pending
W2_CONTRACT: product.v1 commands + editor service ready for review; no HTTP/UI enabled
W3_CONTRACT: unchanged telecom.v1, Issue10 writes blocked
DB: 27 zero-to-head migrations PASS; 25 published unchanged; command/reader/audit rollback suites PASS
SUPABASE: production untouched; PR25/26 candidate evidence read
BLOCKERS: full dependency audit fails on inherited braces advisory (Issue29); product Supabase acceptance/transport pending; remaining P0 modules pending
NEXT_3: resolve inherited tooling audit (Issue29); tasks/calendar/opportunities; dashboard/search, then billing

Local canonical-v2 history and untracked working tree were preserved before fetch.
New work uses a separate worktree; historical repository has disabled push URL.
PR14/17/C2 reviews accept safe composition; PR24/25/26 need owner adoption.

QUALITY: local Node tests/lint/types/build and SQL evidence recorded in PR checkpoint.
RECOVERY: PR24 source-reviewed tests selectively adopted and product manifest extended; no merge.

B2_IMPLEMENTATION_SHA: bd996a9ab4bc0e13cfe3eac61fc00bc3e9bb4c1d
CI275: run37126869848; 27 migrations/PGlite/native/schema/role/grants/Secret scan PASS.
NATIVE: fresh/restored 76-function matrices PASS, no-ACL negative rejected; 20
independent create processes return one receipt/one audit; 20 distinct CAS edits
have one winner/19 conflicts; process replay/changed-input/revocation PASS.
QUALITY: CI lint/types/138 tests/build PASS; full npm audit FAIL (5 high entries
from one inherited DEV tooling advisory). Package/lock unchanged. npm audit
--omit=dev local currently 0; does not replace the full gate. Issue29 open.
FINAL_BOUNDARY_TESTS: 140 local tests after scalar-ID/accessor-array hardening;
final CI result must be read on the published follow-up SHA.
SESSION_SCOPE: B1-B2 complete as a Draft candidate. B3 implemented as a candidate; B4-B12 remain in progress/pending.
FULL_HISTORICAL_AUDIT: initial inventory only; deep audit continues per module.
PARITY_PERCENTAGES: unmeasured; no claim of full parity or Superset readiness.

## 2026-10-04 B3 checkpoint

TASKS: create/update/start/complete/reopen/cancel; canonical states, CAS/idempotent JWT commands.
CALENDAR: offset-aware meetings create/update/reschedule/complete/cancel/no_show; 93-day bounded overlap query with task and date-only renewal/permanence deadlines; filters and stable cursor.
OPPORTUNITIES: normal manual commands, canonical stage graph, expected close/next action, same-customer normalized product links and bounded coded history.
POLICY: owner/admin/member normal work writes; viewer read-only. B2 customer/contact policy unchanged. Raw tables/private helpers remain closed.
CONTRACT: docs/master/PRODUCT_WORK_V1_CONTRACT.md; product.v1 types/service.
DB: local 29 migrations + existing/B3 SQL + 102-function privilege manifest PASS; native fresh/restored/process checks added, published CI pending.
SUPABASE_LOCAL: B3 actual Auth/JWT/PostgREST not yet executed; no UI permission inferred.
ISSUE29: checked once 2026-10-04; registry latest braces remains3.0.3 and latest Next ESLint still uses fast-glob3.3.1. Keep open and keep full audit/lint gates.
NEXT: publish/review B3 CI; dashboard v2/global search; exact billing + transport/local Supabase.

## Concurrent checkpoint reconciliation

Adopted ce8b1fd B3, preserved local duplicate implementation in safety branch.
Additional transport/session/CSRF/byte bounds and real Supabase/Next harness
candidate; forward migration30 explicitly permits member normal customer/contact
operations and authorized contact editors. No fiscal/team authority added.
Local/CI evidence is refreshed after reconciliation; no prior duplicate29 migration
claim substituted for the final tree. Continue dashboard/search/billing.

## B5 dashboard/search continuation — 2026-10-04

Preserved unpublished work on local/w1-b5-preserved before adopting concurrent c5193dc. B5 extends that user-JWT transport without a duplicate endpoint. Migration 20261004170000 adds bounded typed dashboard/search reads. Workspace dashboard explicitly requires owner/admin after normal commercial commands were opened to members; team and financial metrics remain unavailable. SQL/runtime regressions and actual Supabase SSR-cookie/race/revocation checks extend the existing harness. Embedded 31-migration/104-function fresh/restored checks and 170 Node tests pass. Build regenerated stale Next route declarations; types are rechecked before publication. Native and actual-platform B5 acceptance remain pending CI; inherited audit gate stays blocking. Contracts: docs/master/PRODUCT_DASHBOARD_TRANSPORT.md.
