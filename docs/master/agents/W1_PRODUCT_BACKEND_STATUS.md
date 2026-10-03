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
SESSION_SCOPE: B1-B2 complete as a Draft candidate. B3-B12 not implemented.
FULL_HISTORICAL_AUDIT: initial inventory only; deep audit continues per module.
PARITY_PERCENTAGES: unmeasured; no claim of full parity or Superset readiness.
