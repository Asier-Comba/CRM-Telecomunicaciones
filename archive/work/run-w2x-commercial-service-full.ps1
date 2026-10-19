$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-commercial-service-full-wait-requested.json){throw 'FULL_WAITER_ALREADY_REQUESTED'}
@{state='WAITING_PUBLISHED15';expected_tests=981;expected_files=70}|ConvertTo-Json|Set-Content work/w2x-commercial-service-full-wait-requested.json
$watch=[Diagnostics.Stopwatch]::StartNew()
do{
 $cp=Get-Content work/w2x-service-parent-read-checkpoint.json -Raw|ConvertFrom-Json
 if($cp.published -and $cp.publication -eq 'PUBLISHED'){break}
 if($watch.Elapsed.TotalMinutes -gt 40){throw 'NO_PUBLISHED15_NO_FULL_DISPATCH'}
 Start-Sleep -Seconds 5
}while($true)
if((git -C $repo rev-parse HEAD) -ne $cp.sha -or (git -C $repo status --porcelain)){throw 'SOURCE15_NOT_CLEAN_PINNED'}
if($cp.checks.browser -ne 21 -or $cp.checks.build -ne 66 -or $cp.checks.scan -ne 'PASS'){throw 'OWN15_CONTROLS_NOT_COMPLETE'}
$sha=$cp.sha
Set-Location $repo
$ErrorActionPreference='Continue'
npx playwright test --config ../playwright-w2x-commercial-service-full.config.cjs --list *> ../w2x-commercial-service-full-collection.txt
$collection=$LASTEXITCODE
$ErrorActionPreference='Stop'
if($collection -ne 0 -or (Get-Content ../w2x-commercial-service-full-collection.txt -Tail 1) -ne 'Total: 981 tests in 70 files'){throw 'FULL_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ../w2x-commercial-service-full-requested.json){throw 'FULL_ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$sha;tests=981;files=70;workers=1;retries=0;timeout=60000}|ConvertTo-Json|Set-Content ../w2x-commercial-service-full-requested.json
$ErrorActionPreference='Continue'
npx playwright test --config ../playwright-w2x-commercial-service-full.config.cjs *> ../w2x-commercial-service-full-browser.txt
$actual=$LASTEXITCODE
Set-Content ../w2x-commercial-service-full-browser-exit.txt $actual
$ErrorActionPreference='Stop'
Set-Location $root
python work/checkpoint-w2x-commercial-service-full.py
if($LASTEXITCODE){throw 'FULL_CHECKPOINT_SOURCE_OR_TOTAL_GUARD_FAILED'}
. ./work/CrmGitHub.ps1
$cp=Get-Content work/w2x-commercial-service-full-checkpoint.json -Raw|ConvertFrom-Json
$body='CI LOCAL W2-X composicion exacta'+$cp.sha+' / arbol'+$cp.tree+', CLAIM6200094084: banco global nuevo981/70archivos, resultado '+$cp.browser_status+', exit real'+$actual+'. Ver checkpoint/log completo; no se heredan876/244/102 ni21. Conservados fallos originales y aborto de harnessPowerShell del primer102, totalesUNKNOWN en aquel intento. Lint0errores3warnings/build66/scan/cola342_16PARTIAL_326sinreconciliar_0READY del mismo SHA. Visual segun checkpoint propio, sin aceptacion integral. AuthDB/Storage/modeloNOT_RUN/API0. HIGH5/W4/ACK principal pendientes, IA writesOFF/issue10OPEN/releaseNOT_ACCEPTED. No cambios de fuente durante este control, sin cancelar ni duplicar. Siguiente unidad comercial independiente solo con CLAIM y fuente elegible; esta evidencia no aprueba release.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$cp.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content work/w2x-commercial-service-full-publication.json}
@{sha=$cp.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content work/w2x-commercial-service-full-publication.json
python work/checkpoint-w2x-commercial-service-full.py published
if($LASTEXITCODE){throw 'FINAL_FULL_CHECKPOINT_FAILED'}
