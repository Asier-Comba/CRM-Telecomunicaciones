$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-mobile-product-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN97_PUBLISHED_AND_PRIOR2109_TERMINAL';tests=2139;files=125}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-customer-list-filter-priority-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN97_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '66_PASS_OWN_SOURCE' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN97_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-drawer-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-drawer-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 120){throw 'PRIOR2109_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS2109'){throw 'PRIOR2109_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-mobile-product-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 2139 tests in 125 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=2139;files=125;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
python work/refresh-w2x-mobile-product-queue.py
if($LASTEXITCODE){throw 'RUNNING_CHECKPOINT_FAILED_PRESERVE_REQUEST'}
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-mobile-product-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body=@"
CI LOCAL W2-X97 — Regresión comercial coalescida2139/125.

Fuente $($final.sha); árbol $($final.tree); CLAIM6256082724. Resultado $($final.browser_status); exit$actual; $($final.browser_summary -join '; '). Colección real:2109anteriores +6Agenda93 +9Servicios94 +9Clientes96 +6prioridad/filtros97. Metadata95 aporta evidencia individual PAR046, no nuevos casos. Se ejecuta solo después de66 propios/build66/lint/scan/visual/publicación97 y2109terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14, preflightReact/child, pin remoto, workers1/retries0/timeout60000 sin cambios. Espera de cola hasta120min únicamente para orquestación, no límites de tests o imagen. Sin duplicar, cancelar, retargetear ni heredar PASS.

Se conservan todos los originales, incluidos nombres96 con2FAIL4PASS39,8s yprimer intento de geometría móvil inválida;prioridad97 con2FAIL4PASS53s de causas distintas yprobeordinario1FAIL antes de editar. Banco96 añade solo apertura de filtro;no retira aserciones. La expansión se conserva en padre al cambiarfiltro/remontarhijo. Diez cuadros97 vistos no son2139capturas. Los resultados de fuentes93/94/96/97 siguen su alcance.

HTTP/DTO/componentes/repository/parsers con datos y efectos sintéticos. AuthDB/JWT/RLS/SQL/Nextintegrado/modelo vivoNOT_RUN/API0. Sin ausencia/quiescencia/reinicio/handler/full23 ni aceptación de seguridad. Matriz de fuente97:342/32PARTIAL/310sinreconciliar/0READY, PAR046 conserva prueba94. CincoHIGH/W4 pendientes,IA comercial writesOFF,issue10OPEN,releaseNOT_ACCEPTED. F736/B9,fallos de fixtures yoriginales no desaparecen ni reciben causa nueva por este control. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Continuar otra unidad útil tras el checkpoint.
"@

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

