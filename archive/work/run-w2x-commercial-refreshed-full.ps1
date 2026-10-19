$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-commercial-refreshed-full-wait-requested.json){throw 'FULL_WAITER_ALREADY_REQUESTED'}
@{state='WAITING_PUBLISHED26';expected_tests=1155;expected_files=76}|ConvertTo-Json|Set-Content work/w2x-commercial-refreshed-full-wait-requested.json
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$prior=if(Test-Path work/w2x-commercial-installed-full-checkpoint.json){Get-Content work/w2x-commercial-installed-full-checkpoint.json -Raw|ConvertFrom-Json}else{$null};if($prior -and $prior.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'PRIOR1065_NOT_CLOSED_NO1155'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS1065'){throw 'PRIOR1065_FAILED_INSPECT_BEFORE_NEW_FULL'}
do{
 $cp=Get-Content work/w2x-portability-command-read-checkpoint.json -Raw|ConvertFrom-Json
 if($cp.published -and $cp.publication -eq 'PUBLISHED'){break}
 if($watch.Elapsed.TotalMinutes -gt 40){throw 'NO_PUBLISHED26_NO_FULL_DISPATCH'}
 Start-Sleep -Seconds 5
}while($true)
if((git -C $repo rev-parse HEAD) -ne $cp.sha -or (git -C $repo status --porcelain)){throw 'SOURCE26_NOT_CLEAN_PINNED'}
if($cp.checks.browser -ne 105 -or $cp.checks.build -ne 66 -or $cp.checks.scan -ne 'PASS'){throw 'OWN26_CONTROLS_NOT_COMPLETE'}
$sha=$cp.sha
Set-Location $repo
$ErrorActionPreference='Continue'
npx playwright test --config ../playwright-w2x-commercial-refreshed-full.config.cjs --list *> ../w2x-commercial-refreshed-full-collection.txt
$collection=$LASTEXITCODE
$ErrorActionPreference='Stop'
if($collection -ne 0 -or (Get-Content ../w2x-commercial-refreshed-full-collection.txt -Tail 1) -ne 'Total: 1155 tests in 76 files'){throw 'FULL_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ../w2x-commercial-refreshed-full-requested.json){throw 'FULL_ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$sha;tests=1155;files=76;workers=1;retries=0;timeout=60000}|ConvertTo-Json|Set-Content ../w2x-commercial-refreshed-full-requested.json
$ErrorActionPreference='Continue'
npx playwright test --config ../playwright-w2x-commercial-refreshed-full.config.cjs *> ../w2x-commercial-refreshed-full-browser.txt
$actual=$LASTEXITCODE
Set-Content ../w2x-commercial-refreshed-full-browser-exit.txt $actual
$ErrorActionPreference='Stop'
Set-Location $root
python work/checkpoint-w2x-commercial-refreshed-full.py
if($LASTEXITCODE){throw 'FULL_CHECKPOINT_SOURCE_OR_TOTAL_GUARD_FAILED'}
. ./work/CrmGitHub.ps1
$cp=Get-Content work/w2x-commercial-refreshed-full-checkpoint.json -Raw|ConvertFrom-Json
$body='CI LOCAL W2-X composicion exacta '+$cp.sha+' / arbol '+$cp.tree+', CLAIM6203275119: banco global nuevo1155/76archivos resultado '+$cp.browser_status+', exit real '+$actual+'. Incluye60SIMpostcomando fixturelinea1/SIM2 y30portabilidadpostcomando frente1065ff5e5a7;ningun PASS heredado. Build66/lint0errores3warnings/scan/cola342_19PARTIAL_323sinreconciliar_0READY del mismoSHA,visual parcial6 de mismafuente. Source25 primer114/refinamiento de fixture conservado,final114 separado;original9816b469FAIL979+2complementarios/RCA2no cerrado permanece. AuthDB/Storage/modeloNOT_RUN/API0,HIGH5/W4/ACKprincipal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Fuente congelada,sin cancelar ni duplicar;1065anterior se cerro antes de este nuevo dispatch. Siguiente unidad comercial independiente conCLAIM,no release.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$cp.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content work/w2x-commercial-refreshed-full-publication.json}
@{sha=$cp.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content work/w2x-commercial-refreshed-full-publication.json
python work/checkpoint-w2x-commercial-refreshed-full.py published
if($LASTEXITCODE){throw 'FINAL_FULL_CHECKPOINT_FAILED'}
