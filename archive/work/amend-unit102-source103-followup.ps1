$ErrorActionPreference='Stop'
. ./work/CrmGitHub.ps1
$pub=Get-Content work/w2x-customer-domain-table-title-wrap-publication.json -Raw|ConvertFrom-Json
$id=($pub.handoffs|Where-Object issue -eq 67).id
$c=Invoke-CrmApi ('/issues/comments/'+$id)
$marker='FOLLOWUP103_EXACT_SOURCE'
if(-not $c.body.Contains($marker)){
 $c.body|Set-Content work/w2x-unit102-handoff-before-source103-followup.md -Encoding utf8
 $extra="`n`nFOLLOWUP103_EXACT_SOURCE: sobre este producto b842 se reprodujo después el nombre global de cliente160 (3FAIL3PASS38,5s;tabla2229,953125/client1198). Se corrige en fuente SEPARADA103 002c2565894e26eafa6349e29aac391c1e607873, propia90PASS1,7min/build66/9capturas ypublicada, handoff6256673088. Los81 y2172 de b842 no contienen ese banco/corrección;mantener defecto conocido en source102 aunque2172 pase. Sin reejecutar ni atribuir PASS retroactivo. Fuente103 todavía reproduce operador largo, unidad104 en curso sin aceptación."
 $null=Invoke-CrmApi ('/issues/comments/'+$id) Patch @{body=($c.body+$extra)}
}
