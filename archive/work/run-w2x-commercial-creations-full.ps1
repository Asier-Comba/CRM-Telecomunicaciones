$ErrorActionPreference='Stop'
$root=Split-Path -Parent $PSScriptRoot
$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
Set-Location $root
if(Test-Path work/w2x-commercial-creations-full-wait-requested.json){throw 'FULL_WAITER_ALREADY_REQUESTED'}
@{state='WAITING_PUBLISHED31';expected_tests=1266;expected_files=80}|ConvertTo-Json|Set-Content work/w2x-commercial-creations-full-wait-requested.json
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$prior=if(Test-Path work/w2x-commercial-refreshed-full-checkpoint.json){Get-Content work/w2x-commercial-refreshed-full-checkpoint.json -Raw|ConvertFrom-Json}else{$null};if($prior -and $prior.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'PRIOR1155_NOT_CLOSED_NO1266'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS1155'){throw 'PRIOR1155_FAILED_INSPECT_BEFORE_NEW_FULL'}
do{
 $cp=Get-Content work/w2x-portability-create-read-checkpoint.json -Raw|ConvertFrom-Json
 if($cp.published -and $cp.publication -eq 'PUBLISHED'){break}
 if($watch.Elapsed.TotalMinutes -gt 40){throw 'NO_PUBLISHED31_NO_FULL_DISPATCH'}
 Start-Sleep -Seconds 5
}while($true)
if((git -C $repo rev-parse HEAD) -ne $cp.sha -or (git -C $repo status --porcelain)){throw 'SOURCE31_NOT_CLEAN_PINNED'}
if($cp.checks.browser -ne 210 -or $cp.checks.build -ne 66 -or $cp.checks.scan -ne 'PASS'){throw 'OWN31_CONTROLS_NOT_COMPLETE'}
$sha=$cp.sha
Set-Location $repo
$ErrorActionPreference='Continue'
npx playwright test --config ../playwright-w2x-commercial-creations-full.config.cjs --list *> ../w2x-commercial-creations-full-collection.txt
$collection=$LASTEXITCODE
$ErrorActionPreference='Stop'
if($collection -ne 0 -or (Get-Content ../w2x-commercial-creations-full-collection.txt -Tail 1) -ne 'Total: 1266 tests in 80 files'){throw 'FULL_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ../w2x-commercial-creations-full-requested.json){throw 'FULL_ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$sha;tests=1266;files=80;workers=1;retries=0;timeout=60000}|ConvertTo-Json|Set-Content ../w2x-commercial-creations-full-requested.json
$ErrorActionPreference='Continue'
npx playwright test --config ../playwright-w2x-commercial-creations-full.config.cjs *> ../w2x-commercial-creations-full-browser.txt
$actual=$LASTEXITCODE
Set-Content ../w2x-commercial-creations-full-browser-exit.txt $actual
$ErrorActionPreference='Stop'
Set-Location $root
python work/checkpoint-w2x-commercial-creations-full.py
if($LASTEXITCODE){throw 'FULL_CHECKPOINT_SOURCE_OR_TOTAL_GUARD_FAILED'}
. ./work/CrmGitHub.ps1
$cp=Get-Content work/w2x-commercial-creations-full-checkpoint.json -Raw|ConvertFrom-Json
$body='CI LOCAL W2-X composicion exacta '+$cp.sha+' / arbol '+$cp.tree+', CLAIM6203863765: banco global nuevo1266/80archivos resultado '+$cp.browser_status+', exitreal '+$actual+'. Fuente combina selectorSIM6,altaIncidencia15,SIMCreate30,PortCreate60 ybancoanterior1155;1266ejecutadaspropias,sinheredarPASS entreSHAs. Own210final/build66/lint0errores3warnings/scan/Nodepreview5 ycola342_20PARTIAL_322sinreconciliar_0READY de mismafuente;visual parcial12seguncheckpoint,sinaceptacionintegral. Primer210192PASS18fixtureFAIL preservado,final210noheredado;original9816b469FAIL979+2complementarios/RCA2no cerrado yF736/B9 intactos. RegistrodefectosproductocompletoNOT_RECONCILED;ningun global pruebaausencia deotrosdefectos. AuthDB/Storage/modeloNOT_RUN/API0,HIGH5/W4/ACKprincipal pendientes,IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Fuentescongeladassin cancelar/duplicar;ultimo1155cerroantesdedispatch. Siguiente unidadcomercialindependiente conCLAIM,no release.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$cp.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content work/w2x-commercial-creations-full-publication.json}
@{sha=$cp.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content work/w2x-commercial-creations-full-publication.json
python work/checkpoint-w2x-commercial-creations-full.py published
if($LASTEXITCODE){throw 'FINAL_FULL_CHECKPOINT_FAILED'}
