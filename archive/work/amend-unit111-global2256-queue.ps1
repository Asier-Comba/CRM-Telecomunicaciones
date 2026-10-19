$ErrorActionPreference='Stop'
. ./work/CrmGitHub.ps1
$c=Invoke-CrmApi '/issues/comments/6257120606'
if(-not $c.body.Contains('COALESCED2256_WAIT88675')){
 $c.body|Set-Content work/w2x-unit111-handoff-before-global2256-queue.md -Encoding utf8
 $extra="`n`nCOALESCED2256_WAIT88675: colecciónreal2256/135de111 (2214previos+18página108+12QA109+12destinos111). Own11124/build66/scan/PUBLISHED cualifica.2139/source97ha cerradoPASS50,5min/PUBLISHED;2172/source102yaREQUESTED_ONCE. Conhuecoindexliberado,seencola2256source111 único88675despuésde2214terminal/PUBLISHED/PASS;2214siguientey2256following conservados,sinretarget/cancelar/duplicar. NOejecutado2256todavía,noredPASSdeotrasfuentes. QA113/probeopcional ymetadata112fuera delpin111;noheredarresultados niPAR053BROWSERpartialposterior. Timeouttests60000/workers1/retries0intactos;esperacola120minsolo."
 $null=Invoke-CrmApi '/issues/comments/6257120606' Patch @{body=($c.body+$extra)}
}
