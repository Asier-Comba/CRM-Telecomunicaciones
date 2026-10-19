$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$prefix='w2x-commercial-grouped-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$prefix+'-wait-requested.json')){throw 'WAITER_ALREADY_REQUESTED'}
@{state='WAIT_PRIOR1311_TERMINAL_PUBLICATION';source='fa3e16853b4467e554d96af49ac9aeb315978761';tests=1362;files=85}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-attention-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-attention-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($watch.Elapsed.TotalMinutes -gt 55){throw 'PRIOR_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.sha -ne '4221edc8023e68d3497092e92a428838baea1e32' -or $prior.browser_status -ne 'PASS1311'){throw 'PRIOR_FAILED_INSPECT_NO_DISPATCH'}
$cp=Get-Content work/w2x-attention-current-day-checkpoint.json -Raw|ConvertFrom-Json
if($cp.publication -ne 'PUBLISHED' -or $cp.sha -ne 'fa3e16853b4467e554d96af49ac9aeb315978761' -or $cp.checks.browser -ne '63_PASS_OWN_SOURCE' -or $cp.checks.scan -ne 'PASS'){throw 'OWN40_NOT_QUALIFIED'}
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
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-grouped-full.config.cjs --list *> ('../'+$prefix+'-collection.txt')
$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$prefix+'-collection.txt') -Tail 1) -ne 'Total: 1362 tests in 85 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$prefix+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$cp.sha;tests=1362;files=85;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$prefix+'-requested.json')
Push-Location $repo
if((Get-Location).ProviderPath -ne (Resolve-Path $repo).ProviderPath){throw 'REPOSITORY_CWD_REQUIRED'}
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-grouped-full.config.cjs *> ('../'+$prefix+'-browser.txt')
$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$prefix+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$prefix+'.py')
if($LASTEXITCODE){throw 'FULL_CHECKPOINT_GUARD_FAILED'}
$final=Get-Content ('work/'+$prefix+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$body='CI LOCAL W2-X: global agrupado propio de filtro de cliente en Facturación, propuesta vigente y fecha actual de Atención. Fuente '+$final.sha+' / árbol '+$final.tree+', CLAIM6213430782. Resultado '+$final.browser_status+', exit '+$actual+', resumen '+($final.browser_summary -join '; ')+'. Colección real1362/85archivos, banco1311+15filtro+18propuesta+18fecha;ejecutado de nuevo en este SHA sin heredar PASS. Arranca solo tras1311de4221edc terminal/publicado, sin cancelar checks. CWD repositorio explícito y preflight React/child antes de dispatch. Own63/build66/lint0errores3warnings/scan/cola y nueve capturas fecha parcialmente revisadas. HTTP/DTO/reloj de página sintéticos, componentes/repositorio/parsers reales;AuthDB/JWT/RLS/Next integrado/modelo vivoNOT_RUN,API0. Cola de esta fuente342/23PARTIAL/319sinreconciliar/0READY. Original1266de2741fb8 permaneceFAIL1253PASS13FAIL con13complementariosPASS16.1s mismoSHA,no1266singlePASS;F736/B9/981 original/primer210/script33 intactos. HIGH5/W4 pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. Defectos de producto completoNOT_RECONCILED. Fuentes propietarias/recurso/main/PR38/142/153 intactos. Siguiente unidad comercial independiente con CLAIM y controles propios, sin promociones masivas.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content ('work/'+$prefix+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 7|Set-Content ('work/'+$prefix+'-publication.json')
python ('work/checkpoint-'+$prefix+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
