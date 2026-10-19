$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-document-recovery-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN111_PUBLISHED_AND_PRIOR2214_TERMINAL';tests=2256;files=135}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-customer-documents-read-recovery-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN111_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '24_PASS_OWN_SOURCE' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN111_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-customer-journey-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-customer-journey-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 120){throw 'PRIOR2214_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS2214'){throw 'PRIOR2214_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-document-recovery-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 2256 tests in 135 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=2256;files=135;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
python work/refresh-w2x-document-recovery-queue.py
if($LASTEXITCODE){throw 'RUNNING_CHECKPOINT_FAILED_PRESERVE_REQUEST'}
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-document-recovery-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body=@"
CI LOCAL W2-X111 — regresión comercial coalescida2256/135.

Fuente $($final.sha);árbol $($final.tree);CLAIM6257065100. Resultado $($final.browser_status),exit$actual;$($final.browser_summary -join '; '). Colecciónreal2214anteriores+18retornopágina108+12QAComunicaciones109+12recuperaciónDocumentos111. Metadata107/110/112noañadencasos;QA113/fixtureprobeNOincluido,noheredarresultadosdeella. Solo despuésde24propias/build66/lint/scan/visual/publicación111 y2214terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14,React/child,pinremoto,workers1/retries0/timeout60000intactos. Esperacola120min,noampliarlímitestest/imagen;noduplicar/cancelar/retargetear/heredarPASS.

Original1082FAIL4PASS46,2s390y1113FAIL1PASS58,8s390conservados.10912nuevosPASS22,8s conSRC/fixturesintactos,foco/cursor/cliente/lectorUIyventanaacotadalatebody+dosframes,noausencia/quiescencia/handler/reinicio/full23.111retornoyreintentodestinosdocumentosfocaselector/alerta,selecciónexplícita→document.list,bloqueosincursor/cargando. Source111no midiónegativocontrolelegidoduranteespera,mediciónposterior113noheredada. Visualespropiosporunidadparciales,nocapturastodos2256.

HTTP/DTO/componentes/repositorios/parsers yefectossintéticos. AuthDB/JWT/RLS/Storage/membresíafísica/Next/modelovivoNOT_RUN/API0,sinW4nia11ycompleta. Matriz fuente111342/34PARTIAL/308sinreconciliar/0READY;PAR053BROWSERdelpinconservaestadoanterior,metadata112posteriornoheredada. F736/B9yotrosoriginalesconservancausayalcance. HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Principales/ajenas/congeladas,W3/W4/W5/recursoyproducciónintactos. Seguirunidadútiltrascheckpoint,sinrepetirverdesincambio.
"@

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

