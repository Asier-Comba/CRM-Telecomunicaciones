$ErrorActionPreference='Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$p='w2x-commercial-context-full';$repo=Join-Path $PSScriptRoot 'crm-w2x-commercial-composition'
if(Test-Path ('work/'+$p+'-wait-requested.json')){throw 'ALREADY_REQUESTED'}
@{state='WAIT_OWN80_PUBLISHED_AND_PRIOR1887_TERMINAL';tests=1908;files=111}|ConvertTo-Json|Set-Content ('work/'+$p+'-wait-requested.json')
$watch=[Diagnostics.Stopwatch]::StartNew()
while($true){$own=Get-Content work/w2x-assistant-customer-name-wrap-checkpoint.json -Raw|ConvertFrom-Json;if($own.publication -eq 'PUBLISHED'){break};if($watch.Elapsed.TotalMinutes -gt 45){throw 'OWN80_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($own.checks.browser -ne '107_PASS_OWN_SOURCE' -or $own.checks.build -ne '66_PASS' -or $own.checks.scan -ne 'PASS'){throw 'OWN80_NOT_QUALIFIED'}
$priorWatch=[Diagnostics.Stopwatch]::StartNew()
while($true){if(Test-Path work/w2x-commercial-overdue-full-checkpoint.json){$prior=Get-Content work/w2x-commercial-overdue-full-checkpoint.json -Raw|ConvertFrom-Json;if($prior.publication -eq 'PUBLISHED'){break}};if($priorWatch.Elapsed.TotalMinutes -gt 60){throw 'PRIOR1887_NOT_PUBLISHED_NO_DISPATCH'};Start-Sleep -Seconds 5}
if($prior.browser_status -ne 'PASS1887'){throw 'PRIOR1887_FAILED_NO_DISPATCH'}
if((git -C $repo rev-parse HEAD) -ne $prior.sha -or (git -C $repo status --porcelain)){throw 'CHECKOUT_NOT_PRIOR_CLEAN'}
git -C $repo switch --detach $own.sha
if($LASTEXITCODE){throw 'SOURCE_SWITCH_FAILED'}
$remote=git -C $repo ls-remote --heads origin ('refs/heads/'+$own.branch)
if($LASTEXITCODE -or -not $remote.StartsWith($own.sha)){throw 'REMOTE_PIN_MISMATCH'}
Push-Location $repo
$ErrorActionPreference='Continue'
node -e "require.resolve('react/package.json',{paths:[process.cwd()]});require('node:fs').accessSync('tests/e2e-preview/fixtures/c360-failure-waiter-child.mjs');process.stdout.write('CWD_PREREQUISITES_PASS')" *> ('../'+$p+'-cwd-preflight.txt');$cwdcheck=$LASTEXITCODE
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-context-full.config.cjs --list *> ('../'+$p+'-collection.txt');$collection=$LASTEXITCODE
Pop-Location
$ErrorActionPreference='Stop'
if($cwdcheck -or $collection -or (Get-Content ('work/'+$p+'-collection.txt') -Tail 1) -ne 'Total: 1908 tests in 111 files'){throw 'CWD_OR_COLLECTION_MISMATCH_NO_DISPATCH'}
if(Test-Path ('work/'+$p+'-requested.json')){throw 'ALREADY_DISPATCHED'}
@{state='REQUESTED_ONCE';sha=$own.sha;tests=1908;files=111;workers=1;retries=0;timeout=60000;execution_cwd=$repo;cwd_preflight='PASS'}|ConvertTo-Json|Set-Content ('work/'+$p+'-requested.json')
Push-Location $repo
$ErrorActionPreference='Continue'
node node_modules/@playwright/test/cli.js test --config ../playwright-w2x-commercial-context-full.config.cjs *> ('../'+$p+'-browser.txt');$actual=$LASTEXITCODE
Pop-Location
$actual|Set-Content ('work/'+$p+'-browser-exit.txt')
$ErrorActionPreference='Stop'
python ('work/checkpoint-'+$p+'.py')
if($LASTEXITCODE){throw 'CHECKPOINT_FAILED_PRESERVE'}
$final=Get-Content ('work/'+$p+'-checkpoint.json') -Raw|ConvertFrom-Json
. ./work/CrmGitHub.ps1
$nl=[string][char]10+[char]10
$body='CI LOCAL W2-X80 — regresióncomercial coalescidaDocumento/Asistente. Fuente '+$final.sha+', árbol '+$final.tree+', CLAIM6253980196. Resultado '+$final.browser_status+', exit '+$actual+', resumen '+($final.browser_summary -join '; ')+'. Colecciónreal1908/111:1887anteriores+12documentos79+9contexto80. Ejecutadacompletatras107propios/build66/lint/scan/visual/publicación80y1887terminal/PUBLISHED/PASS. CLI14/testDir14/CWD14/preflightReactchild/pinremoto/workers1/retries0/timeout60000;sinherencia/cancelación/duplicación.'+$nl+'DoscontenedoresDocumentos79 yunoidentidadAsistente80 mantienen nombrescompletos dentrodelviewport. Selecciónexactacliente,lecturasexistentes ydenegaciónsegura. Constanteasinusobanco79eliminada;log79cuatrowarningsyerratapreservados. Propios80funcionalesNOT_RUN_UI_STYLE_ONLY;noheredarNode78ni162de79. SemánticaW178pendienterevisión/consumo. NoW3core/planner/provider/budget/durabilidad/recursoW5modificados.'+$nl+'HTTP/DTOsintético concomponentes/repositorio/parsersreales;regresionesincluyencomandosmanualessimulados. AuthDB/JWT/RLS/SQL/Storage/Nextintegrado/modelovivoNOT_RUN/API0. CountsyvacíosdeclaradosnopromuevenSQL/ausencia/autoridad/durabilidad. Visualparcial9capturas80,no1908screenscompletas.342/30PARTIAL/312sinreconciliar/0READY,HIGH5/W4pendientes,IAwritesOFF,issue10OPEN,releaseNOT_ACCEPTED.'+$nl+'F736/B9/981/1266/fixtures/causales/preparaciónconservados,incluyendoNode78original50PASS1FAIL+2recheckcomplementariosylint79cuatrowarnings. CadaPASSconservafuentepropia. Ramas/fuentesajenas/PR38/142/153/main/W3core/W4/W5/recursointactos. SiFAIL,conservarcausaantesdereintento;siPASS,noaceptaciónintegralniherenciaaotroSHA.'

$posts=@()
foreach($n in @(67,153,38,142)){$c=Invoke-CrmApi ('/issues/'+$n+'/comments') Post @{body=$body};$posts+=@{issue=$n;id=$c.id;url=$c.html_url};@{sha=$final.sha;publication='PARTIAL_HANDOFF';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')}
@{sha=$final.sha;publication='PUBLISHED';handoffs=$posts}|ConvertTo-Json -Depth 8|Set-Content ('work/'+$p+'-publication.json')
python ('work/checkpoint-'+$p+'.py') published
if($LASTEXITCODE){throw 'FINAL_CHECKPOINT_FAILED'}

