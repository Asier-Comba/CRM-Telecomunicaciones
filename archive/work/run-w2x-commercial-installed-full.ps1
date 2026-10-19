$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-document-upload-uncertain'
Set-Location $root
if(Test-Path work/w2x-commercial-installed-full-wait-requested.json){throw 'FULL_WAITER_ALREADY_REQUESTED'}
@{state='WAITING_PUBLISHED23';expected_tests=1065;expected_files=74}|ConvertTo-Json|Set-Content work/w2x-commercial-installed-full-wait-requested.json
$watch=[Diagnostics.Stopwatch]::StartNew()
do{
 $cp=Get-Content work/w2x-service-command-read-checkpoint.json -Raw|ConvertFrom-Json
 if($cp.published -and $cp.publication -eq 'PUBLISHED'){break}
 if($watch.Elapsed.TotalMinutes -gt 40){throw 'NO_PUBLISHED23_NO_FULL_DISPATCH'}
 Start-Sleep -Seconds 5
}while($true)
if((git -C $repo rev-parse HEAD) -ne $cp.sha -or (git -C $repo status --porcelain)){throw 'SOURCE23_NOT_CLEAN_PINNED'}
if($cp.checks.browser -ne 75 -or $cp.checks.build -ne 66 -or $cp.checks.scan -ne 'PASS'){throw 'OWN23_CONTROLS_NOT_COMPLETE'}
$sha=$cp.sha
Set-Location $repo
$ErrorActionPreference='Continue'
npx playwright test --config ../playwright-w2x-commercial-installed-full.config.cjs --list *> ../w2x-commercial-installed-full-collection.txt
$collection=$LASTEXITCODE
$ErrorActionPreference='Stop'
if($collection -ne 0 -or (Get-Content ../w2x-commercial-installed-full-collection.txt -Tail 1) -ne 'Total: 1065 tests in 74 files'){throw 'FULL_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ../w2x-commercial-installed-full-requested.json){throw 'FULL_ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$sha;tests=1065;files=74;workers=1;retries=0;timeout=60000}|ConvertTo-Json|Set-Content ../w2x-commercial-installed-full-requested.json
$ErrorActionPreference='Continue'
npx playwright test --config ../playwright-w2x-commercial-installed-full.config.cjs *> ../w2x-commercial-installed-full-browser.txt
$actual=$LASTEXITCODE
Set-Content ../w2x-commercial-installed-full-browser-exit.txt $actual
$ErrorActionPreference='Stop'
Set-Location $root
python work/checkpoint-w2x-commercial-installed-full.py
if($LASTEXITCODE){throw 'FULL_CHECKPOINT_SOURCE_OR_TOTAL_GUARD_FAILED'}
. ./work/CrmGitHub.ps1
$cp=Get-Content work/w2x-commercial-installed-full-checkpoint.json -Raw|ConvertFrom-Json
$body='CI LOCAL W2-X composicion exacta '+$cp.sha+' / arbol '+$cp.tree+', CLAIM6203001640: banco global nuevo1065/74archivos resultado '+$cp.browser_status+', exit real '+$actual+'. Incluye nuevas30SIM/eSIM+6alta portabilidad+30refresco servicio frente999d889;1065 ejecutadas sobre esta fuente, ningun PASS heredado. Build66/lint0errores3warnings/scan/cola342_18PARTIAL_324sinreconciliar_0READY del mismoSHA;metadataTEL040 posterior conserva su alcance parcial y runtimeNOT_RUN. Visual parcial6 de mismafuente segun checkpoint, sin aceptacion integral. Original981de6b469FAIL con979+2complementarios y segundoRCAno cerrado permanece intacto. AuthDB/Storage/modeloNOT_RUN/API0,HIGH5/W4/ACK principal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Sin fuente modificada durante este control, sin cancelar ni duplicar. Siguiente unidad comercial independiente conCLAIM, no release.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$cp.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content work/w2x-commercial-installed-full-publication.json}
@{sha=$cp.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content work/w2x-commercial-installed-full-publication.json
python work/checkpoint-w2x-commercial-installed-full.py published
if($LASTEXITCODE){throw 'FINAL_FULL_CHECKPOINT_FAILED'}
