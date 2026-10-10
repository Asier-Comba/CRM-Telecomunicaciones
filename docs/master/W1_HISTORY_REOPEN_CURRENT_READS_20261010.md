# Current-history reopen proof — 2026-10-10

PR115 source `c4427cc4fe4e072053ec291a9b6b387455b4d268`, execution
`11ef572e658742e2a506d8882f3311772a13fcac`, identical tree
`ababd2bcda3d93c5c5414d4f47b76fd7bfa42ef6` failed its own disposable
run38007717467/job114080266793 before W2, at
`W3_HISTORY_UI_HISTORY_REOPEN_MESSAGES_TIMEOUT`. Auth/73 migrations and teardown
passed. There was no complete107 result or W2 product artifact. The one actually
viewed failure frame shows `No se pudo validar el historial.` with no visible
conversations/messages. Server diagnostics retain only generic error, network
and syntax categories; the exact upstream cause remains unknown.

The previous reopen check waited only for20 rendered messages. A refused HTML
response or invalid current DTO gives the same eventual render timeout even
though the browser already displays a closed invalid-response error. This unit
observes the ordinary click's current main-document list/get/message reads while
keeping the original click and exact20-message render assertion concurrently.
HTTP200, closed envelope, typed codec, current thread identity/title/version and
nonarchived state are required. Old requests, foreign frames, wrong method/path,
extra inputs and a subsequent navigation cannot supply the evidence. Inspection
is serialized; listeners are released and late waiter/action rejections observed.

No new HTTP call, command, retry, timeout override, API/schema/RLS/auth decision,
history client/UI or business-AI effect is added. A refusal/body/envelope/DTO error
has a constant phase code with no private cause. This closes a verification gap;
it does not claim to fix the original server or pending-auth cause.

Twelve relevant native regressions (five new) and lint4 pass. Six desktop/mobile
real-browser HTTP cases are supplied for the actual history client codec,
covering valid reads, upstreamHTML500 and a foreign current-thread DTO, with3/2
ordinary reads and0 commands. The first local fixture run failed before the
intended click because its HTML omitted UTF-8 charset and decoded the accented
button incorrectly; the fixture header is corrected. That failure is preserved
and supplies no product acceptance. A fresh local browser run is blocked by the
memory resource guard; the six cases require own CI verification. The fixtures
do not prove real Auth/DB or full-stack Windows. Own CI/native/107/55 are pending.
The frozen failures113/115/108 and scanner111 are preserved without retry or
reclassification; canonical38@158 remains unchanged. Audit5HIGH, physical
durability23/W4/#22, live model, persistent Windows and release stay open; AI
business writes stay OFF.
