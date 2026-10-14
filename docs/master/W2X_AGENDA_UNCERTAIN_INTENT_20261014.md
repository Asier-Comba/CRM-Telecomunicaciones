# Agenda: retain uncertain task and meeting commands

W2-X CLAIM6158886778 continues the own branch codex/w2x-document-upload-uncertain-20261014 after the published51c335f2561abb290c3b7f93024a699226b32351 document unit. Base9c361 remains its eligible ancestor. Reuse the own checkout and installed dependencies; previous document SHA, tests and bundle remain historical evidence.

## Problem and change

WorkEditor preserved an immutable task/meeting command while its response was uncertain, but ordinary closing unmounted the editor and lost that command. The original Chromium task-create reproduction fails at dialog visibility after the ordinary close callback. A new create could issue a new command; actual persisted duplication is not claimed from the synthetic test.

Protect busy/uncertain closing through existing Drawer.closeDisabled and the callback guard, with a same-action recovery explanation. Existing intent/dispatch, task states, meeting dates, device timezone, customer/assignee controls and calendar selection logic remain unchanged. Retry keeps the same UUID/input. Normal closing resumes after receipt confirmation. No across-navigation/restart persistence claim or primitive replacement.

## Evidence

18 actual Chromium/component/repository/parser scenarios: task and meeting create/update/complete at390/768/1440, first simulated effect then lost reply, protected X/Escape/fields, exact replay and current calendar readback. Complete Agenda controls30/30 pass, including12 existing date-axis/focus/selection race/refusal regressions. Types/lint and normal build66 pass; recovery reviewed at all three widths. These are synthetic HTTP controls, not Auth/DB acceptance.

Prepared physical check agenda_task_meeting_create_update_complete_exact_lost_response_single_effect uses ordinary authenticated product commands and current UI customer selection, route.fetch before abort, identical replay, one command/audit/version per action, customer linkage, completed state and fresh normal detail read. NOT_RUN until the new composed source executes. It adds no paid model or automated commercial write.

## Coordination

PR153 source37a5 has its own538 preview/1430 internal/build/native85 PASS; Auth112 remains expected, not measured. DD76496/13 and other original failures remain preserved. W5 response6158916484 qualifies the retrospective observations only: the other candidate and complete first-card cause remainUNKNOWN; it is not an integration ACK or W4 approval.

Next: publish this independent Docs+Agenda source and checkpoint, close current37a5 Auth, then compose through existing PR153 only when every current check is terminal and run its own new controls. No principal38/142/W3/W5 source changes, no new PR or overwritten checks. Five HIGH, business IA writesOFF, live modelNOT_RUN, issue10OPEN and releaseNOT_ACCEPTED remain.
