$ErrorActionPreference='Stop'
. ./work/CrmGitHub.ps1
$c=Invoke-CrmApi '/issues/comments/6256673088'
$marker='FOLLOWUP104_EXACT_SOURCE'
if(-not $c.body.Contains($marker)){
 $c.body|Set-Content work/w2x-unit103-handoff-before-source104-followup.md -Encoding utf8
 $extra="`n`nFOLLOWUP104_EXACT_SOURCE: el producto002c anterior todavía reproduce operador160 con3FAIL6PASS1,0min,tabla2235,296875/client1198. Corrección en fuente SEPARADA104 a146988c246152d41176a091a00af6b6b4f9326c, propia99PASS2,5min/build66/9capturas/publicada, handoff6256742580. No contiene esta corrección la fuente103 ni su banco90. Checkpoint conserva defecto medido yfix separado;sin PASSretroactivo."
 $null=Invoke-CrmApi '/issues/comments/6256673088' Patch @{body=($c.body+$extra)}
}
