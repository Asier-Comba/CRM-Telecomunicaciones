$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-calendar-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN53_PUBLISHED';tests=1479;files=92}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$cp=Get-Content work/w2x-calendar-today-checkpoint.json -Raw|ConvertFrom-Json;if($cp.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN53_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($cp.checks.browser -ne '57_PASS_OWN_SOURCE' -or $cp.checks.build -ne '66_PASS' -or $cp.checks.scan -ne 'PASS'){throw 'OWN53_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-draft-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-draft-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 60){throw 'PRIOR1434_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS1434'){throw 'PRIOR1434_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $cp.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$cp.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($cp.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-calendar-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 1479 tests in 92 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$cp.sha;tests=1479;files=92;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-calendar-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$body='CI LOCAL W2-X global comercial1479/92archivos. Fuente '+$final.sha+',árbol '+$final.tree+',CLAIM6251289927. Resultado '+$final.browser_status+',exit '+$actual+',resumen '+($final.browser_summary -join '; ')+'.1434previos+18registeredread+27AgendaHoy. Batería íntegra deestafuente,noPASSheredado. Solo trasown57/build66/lint/scan/9capturas/publicación53 yprevio1434BC3terminal/publicadoPASS;sin cancelar checks nipublicar sobrecheckout activo. Workers1/retries0/timeout60000/CWDrepo/preflightReactchild. AgendaHoy usa fechaMadrid actualyconserva filtros;Actualizar mantiene intervalo manual. HTTP/DTO/relojDatecontrolado/componentes/repositorio/parsers reales;AuthDB/JWT/RLS/Nextintegrado/modelovivoNOT_RUN/API0. Registeredread banco aquí enteroactual,original51FAIL6/PASS12+6complementarios originalfuente preservados,no retroactivo18singlePASS. Colactual342/27PARTIAL/315sinreconciliar/0READY;HIGH5/W4/IAwritesOFF/issue10OPEN/releaseNOT_ACCEPTED. F736/B9/981/1266/fixture45/harness48/fixture51originalesintactos. Fuentesajenas/main/PR38/142/153/W3/W4/W5/recursointactos. SiFAILpreservarcausa,siPASSnoaceptaciónintegral/release niherencia afuente posterior.'
$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}
