# Documents Pro V2 acceptance matrix

2026-10-27 — partial D1A. PASS controlled does not mean PASS Auth or global inventory. No module DONE, W4_ACCEPTED, hosted or release acceptance.

| # | Required scenario | Current evidence / result |
| --- | --- | --- |
| 1 | A/B documents isolated | NOT_RUN new real Auth; original B43 results not inherited |
| 2 | Workspace empty | BLOCKED global reader; empty ONE-target UI PASS controlled |
| 3 | Workspace >100, all pages | BLOCKED global reader; ONE target 123 / seven pages / exact set PASS controlled |
| 4 | Old document found with search/order | BLOCKED W1 document search/name/date/sort contract |
| 5 | Combined server filters | BLOCKED W1; existing target + active/archive persists after reload PASS controlled |
| 6 | Persistent subfolder/move/reload | BLOCKED W1 folder contract/migration |
| 7 | Foreign workspace folder move | BLOCKED W1; NOT_RUN |
| 8 | Folder cycles denied | BLOCKED W1; NOT_RUN |
| 9 | Unauthorized read/write denied | Existing role-change presentation PASS controlled; new real Auth NOT_RUN |
| 10 | Live JWT after membership revocation | NOT_RUN new real Auth |
| 11 | Archive/restore CAS and exact uncertain retry | Preserved implementation; new real Auth NOT_RUN |
| 12 | Late responses after selection/role/workspace | Existing metadata tests and query retirement PASS controlled; new real Auth NOT_RUN |
| 13 | Failed upload never shown available | Unchanged upload; new D4 NOT_RUN, private bytes OFF |
| 14 | Integrity/original bytes | Existing eight image-preview controlled checks PASS; real byte integrity NOT_RUN, W5/W4 gate remains |
| 15 | 390/768/1440 loaded navigation | 3 PASS controlled, captures visually inspected; full authenticated shell NOT_RUN |
| 16 | Focus/Escape/keyboard | 3 viewport drawer/focus controls PASS controlled |
| 17 | Storage outage preserves metadata | NOT_RUN; isolated disposable runner test being prepared |
| 18 | Foreign search/filter/folder/manipulated link | Closed local-link/parser units PASS; global/folder paths BLOCKED, real tenant negative NOT_RUN |

Mandatory future evidence: exact source/tree, independent synthetic tenants/roles, current USER JWT product calls, no service key in browser, real committed mutation with lost response and exact replay, same still-valid revoked JWT, Storage healthy→paused→restored with cleanup failure forcing FAIL. Local Storage outage is availability evidence only, not hosted cache revocation or #179 security approval.
