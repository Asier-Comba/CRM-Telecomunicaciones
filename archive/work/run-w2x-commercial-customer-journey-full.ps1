$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-customer-journey-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN106_PUBLISHED_AND_PRIOR2172_TERMINAL';tests=2214;files=132}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-communications-page-focus-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN106_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '21_PASS_OWN_SOURCE' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN106_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-collection-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-collection-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 120){throw 'PRIOR2172_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS2172'){throw 'PRIOR2172_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-customer-journey-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 2214 tests in 132 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=2214;files=132;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
python work/refresh-w2x-customer-journey-queue.py
if($LASTEXITCODE){throw 'RUNNING_CHECKPOINT_FAILED_PRESERVE_REQUEST'}
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-customer-journey-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body=@"
CI LOCAL W2-X106 — regresión comercial coalescida2214/132.

Fuente $($final.sha); árbol $($final.tree); CLAIM6256801949. Resultado $($final.browser_status),exit$actual; $($final.browser_summary -join '; '). Colección real2172anteriores+9cliente global103+9operador104+12reintentoServicios105+12comunicaciones106. Solo después de21propias/build66/lint/scan/visual/publicación106 y2172terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14,preflightReact/child,pin remoto,workers1/retries0/timeout60000 intactos. Espera de cola hasta120min,no amplía límites de tests/imagen. No duplicar/cancelar/retargetear/heredarPASS.

Originales1033FAIL3PASS38,5s,1043FAIL6PASS1,0min,1053FAIL1PASS48,4s390 conservados.106original4FAIL es selector de fixture:status incluía outputs auxiliares;conservados banco/log/directorio. Selector acotado,producto idéntico:causal-v2 3FAIL1PASS47,5s390,sin confundirlo con el fixture. Banco final igual a v2 yreversible al original solo por selector. Nuevascapturas se revisaron por unidad:9+9+12+12,no2214capturas niaceptación visual completa.

Repositorios/parsers/componentes con HTTP yefectos sintéticos. AuthDB/JWT/RLS/SQL/Next integrado/modelo vivoNOT_RUN/API0;no ausencia/quiescencia/reinicio/handler/full23 nia11y completa. F736/B9 ytodos los originales mantienen causa yalcance. Matriz fuente106:342/33PARTIAL/309sinreconciliar/0READY. HIGH5/W4 pendientes,IA writesOFF,issue10OPEN,releaseNOT_ACCEPTED. Ramas principales/ajenas/congeladas,W3/W4/W5/recurso yproducción intactos. Seguir unidad útil tras checkpoint,no repetir verdes sin cambio.
"@

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

