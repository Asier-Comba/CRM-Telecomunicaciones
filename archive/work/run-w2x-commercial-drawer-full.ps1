$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-drawer-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN92_PUBLISHED_AND_PRIOR2043_TERMINAL';tests=2109;files=121}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-portfolio-selected-title-wrap-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN92_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '282_PASS_OWN_SOURCE' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN92_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-number-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-number-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 60){throw 'PRIOR2043_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS2043'){throw 'PRIOR2043_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-drawer-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 2109 tests in 121 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=2109;files=121;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
python work/refresh-w2x-drawer-queue.py
if($LASTEXITCODE){throw 'RUNNING_CHECKPOINT_FAILED_PRESERVE_REQUEST'}
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-drawer-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='CI LOCAL W2-X92 — Regresión comercial coalescida2109/121. Fuente '+$final.sha+'; árbol '+$final.tree+'; CLAIM 6255554578. Resultado '+$final.browser_status+'; exit '+$actual+'; '+($final.browser_summary -join '; ')+'. Colección real:2043anteriores+48identificadoresSIM90+9tarjetaCartera91+9título92. Tras282propios/build66/lint/scan/visual/publicación92 y2043terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14,preflightReact/child,pin remoto,workers1/retries0/timeout60000. No resultado heredado,retarget,cancelación oduplicación.'+$nl+'Coalescencia de tres cambios:política existente de cierre en identificadoresSIM,envoltura de etiqueta completa en tarjeta ycontención visual de título/botón en Drawer existente. Dos atributos de clase preservan negrita,color,aria-labelledby,props,eventos ypolíticas de cierre. No nuevo componente,API,backend oSQL. Los189/237/36/282 anteriores mantienen solo sus propiosSHAs.'+$nl+'Originales conservados:SIM90 12FAIL4PASS2,9min yfixturecompañeroICCIDsólo-datos con1FAIL1PASS23,4s;tarjeta91 1FAIL1PASS23,1s;selección92 1FAIL1PASS21,9s,scroll1971/cliente389 e inicio-1561. Guard de anclaje de tipografía detenido antes de mutación se conserva como preparación,no causa del producto. También186fallido de88,causalEscape/Tab,preloadNOT_RUN,F736/B9/981/1266 yresto de evidencias con sualcance. UnPASS nuevo no elimina esos hechos.'+$nl+'HTTP/DTO/componentes/repositorio/parsers reales con efectos sintéticos y pruebas de cliente. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0. Visualindividualparcial,no2109capturas. Sin ausencia/quiescencia/reinicio/handler/full23,memoryerasure o seguridad independiente. Matrizfuente92:342/31PARTIAL/311sinreconciliar/0READY;HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. W178revisión/consumo pendiente. Main,PR38/142/153,ramas congeladas yW3/W4/W5/recurso intactos. Continuar otra unidad útil tras el checkpoint.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

