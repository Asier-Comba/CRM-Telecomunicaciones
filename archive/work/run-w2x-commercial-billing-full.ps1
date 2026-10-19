$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-commercial-billing-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$prefix+'-wait-requested.json')){throw 'WAITER_ALREADY_REQUESTED'}
@{state='WAIT_OWN48_TERMINAL_PUBLICATION';tests=1416;files=89}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-billing-proposal-day-checkpoint.json){$cp=Get-Content work/w2x-billing-proposal-day-checkpoint.json -Raw|ConvertFrom-Json;if($cp.publication -eq 'PUBLISHED'){break}};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN48_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($cp.checks.browser -ne '45_PASS_OWN_SOURCE' -or $cp.checks.build -ne '66_PASS' -or $cp.checks.scan -ne 'PASS'){throw 'OWN48_NOT_QUALIFIED'}
$prior=Get-Content work/w2x-commercial-billing-full-checkpoint.json -Raw|ConvertFrom-Json
if($prior.publication -ne 'PUBLISHED' -or $prior.browser_status -ne 'PASS1362'){throw 'PRIOR_NOT_TERMINAL_PUBLISHED_PASS'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'PRIOR_CHECKOUT_NOT_PINNED_CLEAN'}
git -C $repo switch --detach $cp.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($cp.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
if((Get-Location).ProviderPath -ne (Resolve-Path $repo).ProviderPath){throw 'REPOSITORY_CWD_REQUIRED'}
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$prefix+'-cwd-preflight.txt')
$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-billing-full.config.cjs --list *> ('../'+$prefix+'-collection.txt')
$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$prefix+'-collection.txt') -Tail 1) -ne 'Total: 1416 tests in 89 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$prefix+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$cp.sha;tests=1416;files=89;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-requested.json')
Push-Location $repo
if((Get-Location).ProviderPath -ne (Resolve-Path $repo).ProviderPath){throw 'REPOSITORY_CWD_REQUIRED'}
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-billing-full.config.cjs *> ('../'+$prefix+'-browser.txt')
$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$prefix+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$prefix+'.py')
if($LASTEXITCODE){throw 'FULL_CHECKPOINT_GUARD_FAILED'}
$final=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$body='CI LOCAL W2-X global de integración comercial de Facturación. Fuente '+$final.sha+',árbol '+$final.tree+',CLAIM6214415919. Resultado '+$final.browser_status+',exit '+$actual+',resumen '+($final.browser_summary -join '; ')+'. Colección real1416/89archivos:1362 previos+12punto de vínculo+15recuperación de lectura+9revisión propuesta+18fecha. Ejecutado íntegro sobre esta fuente,no hereda PASS1362FA3. Arranca solo tras propios45/build66/lint/scan/publicación48 yprevio1362terminal/publicado;sin cancelar checks. CWDrepo/preflightReact/child explícitos. Nueve capturas de fechas actuales realmente vistas con alcance parcial superior drawer. HTTP/DTO/relojDate controlados,componentes/repositorio/parsers reales;AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN/API0. La colección global contiene guardados manuales sintéticos,noDBreal. Cola342/26PARTIAL/316sinreconciliar/0READY,reviews individuales conservanSHAevidencia. OriginalesF736/B9/981/1266yfixture45/fallo preparación48 intactos. HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. Fuentes ajenas/main/PR38/142/153/W3/W4/W5/recurso intactos. Si falla,conservar causa antes de reintento;si pasa,no aceptación global de producto orelease.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content ('work/'+$prefix+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
