# Unit37 — explicit invoice-list refresh retires the old read error

Oier31 delivery189afe216599feeef863b82e05955c394c44b71b, own branch frozen.
Reviewed/selected only tests3afde2772d7042f682f5bb4a5a812ac89b9e283f→885dab1a
and fixf1a7262f02c1c26a7002d5b03b29eaeea48bd8b9→e2966be4 with attribution,
after Oier30 selected in36. No branch/documentation import, SQL or shared DTO change.

Own before37:3FAIL390/768/1440. After403 then explicit positive reload, row returned
but old access-denied alert remained (expected0,observed1). One callback now clears
previous error on explicit Actualizar facturas before incrementing reload. No
background success clears errors; genuine denied reads still show current failure.
Existing blocked flag prevents normal use during busy/uncertain/registered writes;
pending intent/receipt refs untouched, no commands are sent by this handler.

Own after37:22/22PASS (financial refresh, nine series/refresh cases and initial/
preparation contexts) using actual components/repository/parsers with HTTP fixture.
New cases each require3reads,0commands and0pageerrors. No retries/skips, no timeout
increase. Targetedlint and separatetypesPASS. Full45speech regression on the same
product composition and terminal outcome are bound in final coordination.
36 had global lint/defaultbuild44PASS before this one-callback follow-up; final
source needs its own CI build and exact union, no silent inheritance of that build.
No real AuthDB/cloud/microphone from controlled tests. Exact2files checked against
Oier f1a before publication;35 PromptBuilder stays independently owned.

This closes Oier30/31 integration decision, not full invoice parity, hosted QA or
original39458747653 cause/effect (stillUNKNOWN; no re-emission). W5 owns platform/
cloud/artifacts/deploy and their gates. Budget0EUR, AIbusinesswritesOFF, content
affected by StorageP0OFF; releaseNOT_ACCEPTED. Final remote source/tree/CI in issue67.
