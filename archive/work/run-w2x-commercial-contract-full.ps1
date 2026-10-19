$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-contract-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN84_PUBLISHED_AND_PRIOR1908_TERMINAL';tests=1968;files=114}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-contract-recovery-close-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN84_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '117_PASS_OWN_SOURCE' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN84_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-context-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-context-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 60){throw 'PRIOR1908_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS1908'){throw 'PRIOR1908_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-contract-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 1968 tests in 114 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=1968;files=114;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-contract-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='CI LOCAL W2-X84 — regresión comercial coalescida de recuperación. Fuente '+$final.sha+', árbol '+$final.tree+', CLAIM 6254341915. Resultado '+$final.browser_status+', exit '+$actual+', resumen '+($final.browser_summary -join '; ')+'. Colección real1968/114:1908anteriores+21Incidencias82+27SIM/Contrato83+12Contrato84.1956fue colección preparada yDEFERRED,sin ejecución. Esta ejecución completa llega tras117propios/build66/lint/scan/visual/publicación84 y1908terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14/preflightReactchild/pinremoto/workers1/retries0/timeout60000. Sin herencia,retarget,cancelación oduplicación.'+$nl+'Se consumen controles existentes de cierre ycancelación. El panel de contrato manual usa closeBlocked ya derivado por elhook W2;locked y órdenes permanecen. Incertidumbre mantiene input/command_id;recibo+503 solo consulta;denegación definitiva permite salida yreapertura para nueva orden explícita. Causales82/83/84 ypositivos conservan sus fuentes;efectos son sintéticos,no idempotenciaSQL. Funcionales84NOT_RUN_EXISTING_CONTROL_POLICY_CONSUMPTION,ningúnNodeheredado.'+$nl+'Se preservan SIM83original3FAIL1PASS45,2s enlog/exit/banco yelestado deauxiliares originalesNOT_AVAILABLE_OVERWRITTEN porreutilizaroutputDir. PrimerContrato83fuefalloselector;corregido dejó1FAILreal Cancelarhabilitado. Efecto deesos3casosContratoNOT_MEASURED/reciboNOT_RUN. F736/B9/981/1266/restofallos/fixtures/preparaciónmantienen sualcance;unPASSnoeliminaestos límites.'+$nl+'HTTP/DTO/efectos sintéticos concomponentes/repositorio/parsersreales ycomandosmanuales controlados. AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0. Visualindividualparcial,no1968capturas. Matrizfuente84:342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. W178revisión/consumopendiente;ramas/fuentesajenas/PR38/142/153/main/W3core/W4/W5/recursointactos. SiFAIL,conservarcausaantesdereintentar;siPASS,noaceptaciónintegralniherencia aotroSHA.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

