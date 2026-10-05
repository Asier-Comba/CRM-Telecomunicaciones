# W1 product checkpoint — 2026-10-04

Executable: `b5955fb1bb540036802b57e2e0644be221c8801c`. PR: [28](https://github.com/Asier-Comba/CRM-Telecomunicaciones/pull/28), Draft, base `w2/platform-closure-v1`. This checkpoint records implemented behavior and gaps; it does not claim full historical parity or release approval.

| Requested field | Current evidence/status |
|---|---|
| HEAD | Executable b5955fb1bb540036802b57e2e0644be221c8801c; any subsequent documentation-only commit must preserve its executable blobs |
| CI | [302](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/37224799203) FAIL overall:201 tests/lint/types/build PASS, full audit Issue29 FAIL; secret/migration/baseline/native/embedded PASS; Playwright and dependency review SKIPPED |
| MIGRATION_COUNT |41 fresh zero-to-head; native fresh/restored privilege matrix170 functions |
| OLD_BACKEND_PARITY | Incomplete; historical audit matrix exists, denominator/behavioral parity percentage not measured |
| NORMAL_CRUD | Customer/contact create/update/archive/restore, protected editors, scoped authorization/CAS/replay/audit |
| TASKS | Six canonical human commands, safe reads; native/realJWT races/revocation |
| CALENDAR | Six meeting commands and bounded overlap/keyset read; OAuth/provider sync remains separate |
| OPPORTUNITIES | Eight human commands, canonical stages/history, CAS/replay and scoped reads |
| PORTFOLIO |17 writes plus safe editor: manual contract/service/line and renewal/permanence commands. Explicit child provenance preserved; lifecycle graph and ancestor locks tested. Supersede and verified-origin gate for legacy manual rows remain open |
| DASHBOARD_V2 | Real bounded period counts and protected persisted native-currency finance; unavailable metrics remain explicit |
| GLOBAL_SEARCH | Typed bounded safe search including protected canonical invoice labels; no fiscal snapshot/raw identifiers |
| BILLING | Exact arithmetic, fiscal profiles, drafts/atomic issue/frozen snapshots/payments/trash/restore/protected reads/PDF/review-only normalized proposal. Private stored PDF reference and text/audio parsing still open |
| DOCUMENTS | Four protected metadata operations; byte access denied after archive and restored with metadata. Upload/finalize/scanner/quarantine/signed access remain open |
| INBOX | Product workflow absent |
| AUTOMATIONS | Registered internal execution product workflow absent; no arbitrary URL/provider execution added |
| TEAM | Seven internal operations including bounded read; invitation intent only. No invitation sends/acceptance/owner transfer |
| IMPORTS | Closed forced-RLS lineage schema exists; encrypted staging/quarantine and executable create/resume/apply adapter absent |
| SUPABASE_LOCAL | [23](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/37224799063) PASS522 checks: actual Auth/JWT/PostgREST/Storage and real SSR-cookie Next routes; browser/private-value scan and teardown PASS |
| NATIVE_RACES | Independent20-process create/replay/CAS per work/portfolio/deadline family;20 document archives/restores; billing numbering/replay/CAS; five ancestor closure/child creation races; restoreACL loss negative control PASS |
| W2_SAFE_TO_ENABLE |false for every catalog operation; no frontend activation |
| ISSUE29 | Open; inherited full npm audit failure preserved, no gate weakening |
| ISSUE10 | Open; assistant mutations unregistered/blocked |

## Scope and remaining work

The catalog has80 operations:34 product.v1,1 dashboard.v2,16 billing.v1,7 team.v1,18 portfolio.v1 and4 document.v1. Per-operation Supabase evidence remains explicit; unchanged operations are not blindly marked as newly exercised. Document metadata operations now have exact executable-head acceptance. Every transport stays default off and uses normal user JWT authorization.

B3 core is implemented. B4/B5/B6 have substantial accepted backend coverage; B7/B8/B9/B10/B11/B12 have explicit partial scope. An approximate planning estimate is60–70% of the requested functional scope, not a measured parity result and not a release-readiness percentage. The large missing document/import/inbox/automation flows dominate remaining work.

Current execution blocker: the workspace executor disconnected (`environment_offline`); read-only retry could not reconnect. GitHub remained available, enabling the narrowly scoped forward migration and real CI validation. No new local test results are claimed after disconnection. Existing local alternative portfolio/attention work must be inspected and isolated after reconnection before further edits; unpublished duplicate migrations must not be pushed over the canonical branch.

Storage upload requires the accepted scoped server capability seam; encrypted import staging needs the chosen KMS/storage boundary. Issue12 remains open. Current acceptance explicitly reports signed_access/scoped_service_principal/document_upload as NOT_IMPLEMENTED. A global service-role product identity, caller-selected workspace, plaintext staging or client upload permission expansion is not a completion of these seams.

## NEXT_3

1. Restore the executor, reconcile the unpublished local attention alternative against canonical deadlines, and add/test a verified-manual-origin gate backed by audit/command/import lineage; unknown legacy facts must not gain manual lifecycle authority.
2. Complete the approved private upload/finalize/integrity/quarantine/access seam and encrypted import adapter; validate real Auth/Storage revocation, same-key resume and per-row apply rollback without provider/production effects.
3. Implement provider-neutral inbox assign/read/close/customer links and registered internal automation actions with CAS/idempotency/audit; expand synthetic density, native races and exact-head catalog evidence.

No frontend/assistant/provider/production/real-data writes, published migration edits, force push or main merge occurred. Execution and infrastructure gaps remain visible.
