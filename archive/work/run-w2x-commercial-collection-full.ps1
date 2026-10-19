$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-collection-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN102_PUBLISHED_AND_PRIOR2139_TERMINAL';tests=2172;files=128}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-customer-domain-table-title-wrap-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN102_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '81_PASS_OWN_SOURCE' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN102_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-mobile-product-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-mobile-product-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 120){throw 'PRIOR2139_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS2139'){throw 'PRIOR2139_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-collection-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 2172 tests in 128 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=2172;files=128;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
python work/refresh-w2x-collection-queue.py
if($LASTEXITCODE){throw 'RUNNING_CHECKPOINT_FAILED_PRESERVE_REQUEST'}
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-collection-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body=@"
CI LOCAL W2-X102 — Regresión comercial coalescida2172/128.

Fuente $($final.sha); árbol $($final.tree); CLAIM6256461650. Resultado $($final.browser_status); exit$actual; $($final.browser_summary -join '; '). Colección real:2139anteriores+12paginación99+15actualización/reintento101+6tablaServicios102. Metadata98/100 no añade casos. Solo después de81 propios/build66/lint/scan/visual/publicación102 y2139terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14, React/child preflight,pin remoto,workers1/retries0/timeout60000 sin cambios. Cola espera hasta120min, sin ampliar límites de tests/imagen. Sin duplicar/cancelar/retargetear/heredar PASS.

Originales conservados: foco99 con2FAIL1PASS49,6s;foco101 con3FAIL1PASS40,8s;tabla102 con3FAIL3PASS43,9s y2071/1198 antes deenvolver. Error de auxiliar de montaje101antes de crear salidas,15originales intactos ycorrecciónUTF8 sin repetir tests. Históricos F736/B9,fixtures/preparación ytodos los demás conservan causa yalcance. Nombres largos mantienen texto/href ycampos cortos visibles;foco respeta control elegido yfiltrado vigente. Visuales de cada unidad son parciales,no2172capturas.

HTTP/DTO/componentes/repository/parsers con datos/efectos sintéticos. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0,sin ausencia/quiescencia/reinicio/handler/full23 oseguridad independiente. Matriz fuente102:342/33PARTIAL/309sinreconciliar/0READY,PAR030con99,PAR046con94,PAR086con fuentesindividuales. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Continuar otra unidad útil tras checkpoint sin repetir verdes sin cambio.
"@

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

