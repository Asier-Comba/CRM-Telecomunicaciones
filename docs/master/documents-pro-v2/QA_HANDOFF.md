# Separate disposable D1 QA

Product source: #198 `e20ecfd9ee7b36fb6c4d97146ac7063b3458e01e` (B43 base). QA branch is stacked onto #198 and changes only its own helper/workflow and this handoff. It does not modify shared run-stack, canonical 87 migrations, application contracts or Storage policies.

Physical status at publication: NOT_RUN. Publication does not opt in Docker execution. The workflow requires a separate PR-body activation containing the exact current head SHA (`DOCUMENTS_D1_RUN_SHA=<reviewed head>`); later pushes do not inherit it. W5 technical review is requested before activation. This is not W4 security/release approval.

`run.mjs` requires an actual fresh GitHub runner, explicit D1 flag, exact loopback/project/CLI, no hosted credentials/ref and canonical 87 applied migrations. `real-acceptance.mjs` creates four synthetic Auth users in two workspaces, uses real browser password login and current USER JWT product calls. Service key remains Node-only for fixture Auth administration and never enters the allowlisted Next environment, browser, screenshots or report.

The helper covers scoped target 123-document traversal, reload/previous, loaded 390/768/1440 captures/drawer/focus, empty target, archived filter, two-tenant positives/negatives, owner/member/viewer, actual archive commit with deliberately lost response and exact replay, restore/stale CAS, and exact HTTP-request cookie JWT verified still valid after membership suspension. It does not claim workspace-global inventory, folder acceptance, successful upload or byte integrity.

Controlled local Storage outage verifies the exact disposable container/image/running/unpaused state and USER JWT Storage 200 before pausing. It confirms an actual unavailable probe while metadata HTTP/UI still succeeds; finally unpause and healthy 200 are required. Browser cleanup stages all execute independently and any cleanup/restoration failure forces global FAIL. Canonical stack teardown is also required. No hosted/CDN/cache revocation or #179 acceptance can be inferred.

Evidence is bound to actual checkout source/tree, reports closed check names/statuses only, keeps traces off and retains synthetic loaded PNGs separately. Original full suite remains attributable only to its own exact product SHA. No repeated full suite to obtain green; own isolated QA failures remain separate and any correction receives a new SHA.
