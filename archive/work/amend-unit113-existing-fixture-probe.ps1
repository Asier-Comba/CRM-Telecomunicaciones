$ErrorActionPreference='Stop'
. ./work/CrmGitHub.ps1
$i=Invoke-CrmApi '/issues/67';$last=[Math]::Max(1,[Math]::Ceiling($i.comments/100));$comments=@()
foreach($page in @([Math]::Max(1,$last-1),$last)|Select-Object -Unique){$batch=Invoke-CrmApi ('/issues/67/comments?per_page=100&page='+$page);foreach($entry in $batch){$comments+=$entry}}
$comments|ConvertTo-Json -Depth 20|Set-Content work/w2x-unit113-amend-coordination.json -Encoding utf8
$known=@(Get-ChildItem work -Filter '*checkpoint.json'|ForEach-Object {try{(Get-Content $_.FullName -Raw|ConvertFrom-Json).claim}catch{}})
if(@($comments|Where-Object {$_.body -match '^\s*CLAIM' -and $_.id -notin $known}).Count){throw 'UNKNOWN_CLAIM_REVIEW_REQUIRED'}
$c=Invoke-CrmApi '/issues/comments/6257170620';if(-not $c.body.StartsWith('CLAIM W2-X113')){throw 'WRONG_CLAIM'}
if(-not $c.body.Contains('AMEND_EXISTING_FIXTURE_CUSTOMER_PROBE')){
 $c.body|Set-Content work/w2x-unit113-claim-before-existing-probe-amend.md -Encoding utf8
 $extra="`n`nAMEND_EXISTING_FIXTURE_CUSTOMER_PROBE: intento original9 termina6PASS3FIXTURE_FAIL3,6min. Tres customer_supersedes fallan al buscar selectorB ausente por earlyreturn del modo customer-document-targets,antes de cambiar propcliente;no defecto producto. Conservar banco/log/directorio/tres capturasfallidas ylintoriginal. Se añade control de cliente SOLO concustomerProbe=1 aentrada existente customer-resource usando mismoestado id/servidor;no nuevofixture/recurso,pantalla producto,servicioW5 niSRC. Modo original sinprobe reversible exactamente y12contract-selection regresiones en intento corregido21 (9primarios+12contextuales). URL del banco cambia solo para familia customer_supersedes,sin quitar aserciones/relajar60s. Resultados/logs corregidos enotro directorio;no reemplazaroriginales nicontar9PASSoriginal. Lintdirigido banco+fixture;buildNOT_RUN_TEST_FIXTURE_ONLY_SRC_UNCHANGED,no66heredado. MantenerlimitacionesAuthDB/RLS/Next/modelo/W4;FIFO2172/2214/2256pinnedfuentesanterioresnoincluyen113."
 $r=Invoke-CrmApi '/issues/comments/6257170620' Patch @{body=($c.body+$extra)}
 if(-not $r.body.Contains('AMEND_EXISTING_FIXTURE_CUSTOMER_PROBE')){throw 'AMEND_READBACK_FAILED'}
}
