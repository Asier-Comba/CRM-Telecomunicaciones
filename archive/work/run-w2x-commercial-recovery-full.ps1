$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-recovery-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-deferred.json')){throw 'PREPARED_CANDIDATE_DEFERRED_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN83_PUBLISHED_AND_PRIOR1908_TERMINAL';tests=1956;files=113}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-sim-recovery-close-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN83_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '297_PASS_OWN_SOURCE' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN83_NOT_QUALIFIED'}
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
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-recovery-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 1956 tests in 113 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=1956;files=113;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-recovery-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='CI LOCAL W2-X83 — regresión comercial con recuperación de Incidencias y SIM/eSIM. Fuente '+$final.sha+', árbol '+$final.tree+', CLAIM 6254173236. Resultado '+$final.browser_status+', exit '+$actual+', resumen '+($final.browser_summary -join '; ')+'. Colección real1956/113:1908anteriores+21Incidencias82+27SIM/consumidorContrato83. Ejecutada completa tras297propios/build66/lint/scan/visual/publicación83 y1908terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14/preflightReactchild/pinremoto/workers1/retries0/timeout60000;sinherencia/cancelación/duplicación.'+$nl+'W2 reutiliza closeDisabled/cancelDisabled yestados existentes;closeBlocked derivado distingue bloqueo deinputs de cierre seguro tras403sin propuesta/pendiente/recibo. No reescritura de primitivas,estado/efectos/algoritmos/SQL/servicios nuevos. SIM incierta mantiene ordenexacta;recibo+lecturafallida solo consulta;denegación permite salida/reapertura explícita con nueva orden. Contrato3casos físico del feedback,efectoNOT_MEASURED/reciboNOT_RUN. Propios83funcionalesNOT_RUN_EXISTING_UI_CONTROL_STATE_WIRING,noNodeheredado.'+$nl+'OriginalSIM3FAIL1PASS45,2s conserva log/exit/banco;auxiliares originalesNOT_AVAILABLE_OVERWRITTEN porreutilizaroutputDir enprimerContrato. PrimerContratoFAILselector dinámico,correcciónsoloidentidaddialog,noaserciones;causalcorregido1FAILporCancelarhabilitado,separado. Fallos/limitaciones no se borran porPASSposterior. F736/B9/981/1266/resto fixtures/preparación conservados.'+$nl+'HTTP/DTO/efectos sintéticos concomponentes/repositorio/parsersreales ycomandosmanuales. AuthDB/JWT/RLS/SQL/Nextintegrado/modelovivoNOT_RUN/API0;noSQLidempotencia,ausencia,autoridad,durabilidad niW4. Visual individual parcial,no1956screens. Matrizfuente83:342/31PARTIAL/311sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED. W178revisión/consumo pendiente. Ramas/fuentesajenas/PR38/142/153/main/W3core/W4/W5/recursointactos. SiFAIL,conservarcausaantesdereintento;siPASS,noaceptaciónintegralniherencia aotroSHA.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

