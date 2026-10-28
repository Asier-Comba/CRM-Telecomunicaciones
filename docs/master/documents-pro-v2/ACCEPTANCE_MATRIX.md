# Documents Pro V2 acceptance matrix — 2026-10-28

Current physical scope: **global metadata, FULL117/117 PASS** on SOURCE/EXECUTED
c17d8666dd39435112ac9e1745f496add68147c0, TREE4c87996c28103ce6a40c9eff741480c27eeca2bf,
[run40720188927](https://github.com/Asier-Comba/CRM-Telecomunicaciones/actions/runs/40720188927),
job122928653044. [Closed report](evidence/20261028_GLOBAL_AUTH_C17.safe.json).
These are117 checks in the new global bank, not the historical116 product scenarios.
Default hosted flags remain OFF; this acceptance uses a disposable local Supabase.

| # | Scenario | Current result and limit |
| --- | --- | --- |
|1|A/B documents isolated|PASS real Auth: B positive3, foreign A search/filter/target count0/get/write denied and SQL unchanged|
|2|Empty workspace|PASS distinct complete empty workspace, not unavailable|
|3|Workspace >100/all pages|PASS123 exact ordered unique rows,7 global cursor reads, no target fanout|
|4|Old document/search/order|PASS approved reference outside first page; raw filename unsearchable; created ascending/tie-break read|
|5|Combined server filters|PASS category/format/date/order with reload, customer canonical ancestry and exact target|
|6|Persistent folder/move/reload|BLOCKED D2 ownership/contract/migration; not implemented|
|7|Foreign folder move|NOT_RUN, D2 absent|
|8|Folder cycles|NOT_RUN, D2 absent|
|9|Unauthorized read/write|PASS owner/admin positives, member/viewer UI+HTTP denials, foreign get/write denied|
|10|Same live JWT after membership revocation|PASS exact cookie JWT/input, token still Auth-valid and unexpired, SQL suspended,403/okfalse/access_denied, rows withdrawn; restorePASS|
|11|Archive/restore CAS and uncertain retry|PASS actual committed archive/lost response/frozen exact replay/one command+effect, restore reload/readback and staleCAS409|
|12|Late responses after context changes|PASS real role-denial late200 JSON consumed/settled/no rows before reload, role controls withdrawn; actor/workspace transitions additionally have controlled-component evidence, not a new real tenant-switch claim|
|13|Failed upload never available|NOT_RUN in this metadata bank; no bytes created, contentOFF; D4 gate remains|
|14|Integrity/original bytes/private preview|NOT_RUN new real bytes; #179/security remains unaccepted, no byte enablement|
|15|Loaded390/768/1440 navigation|PASS real full CRM shell; six inventory/details screenshots downloaded, checksum verified and visually inspected|
|16|Focus/Escape/keyboard|PASS actual loaded drawer Tab/ShiftTab/Escape and return focus at all three widths|
|17|Storage outage preserves metadata|PASS actual owned container healthy200→paused/unavailable→metadata HTTP/UI200 plus v1metadata→unpaused/healthy200; availability only, not hosted cache security|
|18|Foreign query/filter/target/manipulated link|PASS real search/customer/target/cursor/get/write negatives; local-link parser controls separate; folder controls absent|

Additional physical gates PASS: database library gate defaultOFF, USER RPC cannot
bypass it, anon/service execution denied, service key excluded from Next/loaded
HTML, current DB gate503 withdraws rows and is distinct from empty, opaque cursor
never in URL, protected filename/path absent, expired authentic/tampered/other
actor/tenant/filter cursors rejected. No privileged browser client or bytes.

Retained causal attempts:785FULL FAIL98/unclassified late phase; e222focused
FAIL21 proves ambiguous library/Next alerts before observer; c17focused PASS23
after test-locator correction; then one c17FULL PASS117. No product/permission/
action/timeout change. The missing original diagnostic is not retroactively
invented. All older scoped QA199 failures also remain retained in its handoff.

Safe artifact12829214919 SHA25621a08240b5acf9da17380eb455bd5a3b42ca128c0d6a2ef2b8879673bc29fcd7.
Synthetic UI12830710718 SHA2565bea6e5f6fd523a6f2baf53f1b499f8fecce63db72e10caebd353822b04d919c.
Role/membership/Storage/browser/server/stack restoration and cleanupPASS. W4
independently corroborates FULL with its metadata-only limits; no W4_ACCEPTED.
Main CI40718130579 FAIL native registry data limit before SQL; quality/build/
embedded/preview checksPASS, dependent CriticalPlaywrightSKIPPED; allrefFAIL.
D2, bytes, hosted schema/runtime/network/privacy, global security and release
remain separate. No module DONE or staging/production acceptance is declared.
