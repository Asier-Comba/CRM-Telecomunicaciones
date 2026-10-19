$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-line-context-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN57_PUBLISHED';tests=1575;files=96}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$cp=Get-Content work/w2x-portability-create-parents-checkpoint.json -Raw|ConvertFrom-Json;if($cp.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN57_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($cp.checks.browser -ne '114_PASS_OWN_SOURCE' -or $cp.checks.build -ne '66_PASS' -or $cp.checks.scan -ne 'PASS'){throw 'OWN57_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-calendar-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-calendar-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 60){throw 'PRIOR1479_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS1479'){throw 'PRIOR1479_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $cp.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($cp.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-line-context-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 1575 tests in 96 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$cp.sha;tests=1575;files=96;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-line-context-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$body='CI LOCAL W2-X: integración agrupada de vigencia de líneas. Fuente '+$final.sha+', árbol '+$final.tree+', CLAIM6251598765. Resultado '+$final.browser_status+', exit '+$actual+', resumen '+($final.browser_summary -join '; ')+'. Colección real1575/96 archivos:1479 anteriores+18 selección Portabilidad+18 detalle Portabilidad+30 detalle SIM/eSIM+30 padres tras alta. Ejecutada completa en esta fuente; ningún PASS heredado. Arranca solo tras propios114/build66/lint/scan/visual/publicación57 y1479 Agenda terminal/publicado PASS. Workers1/retries0/timeout60000, CWDrepo y preflightReact/child; sin cancelar ni duplicar checks.'+([string][char]10+[char]10)+'Usa readLineContext existente, con predicados de selección, detalle y montaje; sin duplicar recurso o primitivas ni tocar W3/W4/W5. Bancos HTTP/DTO con componentes/repositorio/parsers reales; no autoridad, ausencia SQL, cancelación de red, Auth/DB/JWT/RLS/Next integrado ni modelo vivo certificados. API0. Algunas regresiones incluyen comandos manuales simulados; IA comercial writes OFF.'+([string][char]10+[char]10)+'Matriz342/27 PARTIAL/315 sin reconciliar/0 READY. Cinco HIGH/W4 pendientes, issue10 OPEN, release NOT_ACCEPTED. F736/B9/981/1266 y originales de fixture/preparación preservados; negativos causales54/55/56/57 separados. Fuentes ajenas/main/PR38/142/153/W3/W4/W5/recurso intactos. Si falla, conservar causa y controles antes de cualquier reintento; si pasa, no implica aceptación integral del producto ni release o herencia a SHA posterior.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
